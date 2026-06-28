/* HELIODON — an abstract SUN-STUDY.
 * A heliodon is an architect's instrument for simulating sun position and casting
 * accurate shadows on a model. Here: a small set of clean MACHINED SOLIDS on a
 * calibration ground (graph paper / protractor arcs / measured grid) under a
 * single low raking sun that casts LONG, PRECISE, calibrated shadows.
 * Minimal, technical, serious — museum diagram crossed with Hammershøi calm.
 *
 * SURREAL HOOK (real-but-off): the shadows LIE. A solid casts a shadow of a
 * DIFFERENT shape; two solids share one light yet throw shadows in conflicting
 * directions; a shadow detaches or points the wrong way; a sphere casts a square.
 * Quiet, precise, uncanny — never wacky.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Sun-study light worlds — muted, instrument-like. Each = ground + solids
     (lit/mid/core faces) + shadow + sun + ink (linework/numerals). */
  const PALS = [
    { name: 'Equinox',    ground: '#e7ddc8', grid: '#c8bca0', lit: '#f4efe6', mid: '#d9d2c4', core: '#b3aa98', shadow: '#3a4a78', shadowA: 0.34, sun: '#e8a93c', ink: '#5b4f3c', tick: '#8a7c62' },
    { name: 'Solstice',   ground: '#e9d8a6', grid: '#cdb87f', lit: '#f6f1e3', mid: '#ddd3bd', core: '#b8ab8e', shadow: '#5a5168', shadowA: 0.38, sun: '#caa028', ink: '#6a5a3a', tick: '#9a824e' },
    { name: 'Gnomon',     ground: '#d6d8dc', grid: '#b3b7bd', lit: '#f5f6f7', mid: '#d7dadd', core: '#abafb5', shadow: '#2c2f34', shadowA: 0.40, sun: '#c9433a', ink: '#3a3d42', tick: '#c0453c' },
    { name: 'Blue Hour',  ground: '#5b6678', grid: '#48515f', lit: '#c3c9d2', mid: '#9aa3b1', core: '#727c8c', shadow: '#1a2138', shadowA: 0.52, sun: '#7fd0e0', ink: '#aeb7c4', tick: '#86c6d6' },
    { name: 'Terracotta', ground: '#cf9f80', grid: '#b3805f', lit: '#efe2d4', mid: '#d4bda8', core: '#aa8d77', shadow: '#1f5a57', shadowA: 0.40, sun: '#e9925a', ink: '#5a3a2c', tick: '#8a5238' },
    { name: 'Eclipse',    ground: '#9aa0a4', grid: '#7f868b', lit: '#dfe2e3', mid: '#b6bbbe', core: '#888e92', shadow: '#23282c', shadowA: 0.44, sun: '#e6e0cf', ink: '#33383c', tick: '#5a6064' },
  ];

  const MODES = ['Gnomon', 'Solids', 'Conflict', 'Dial', 'Field', 'Section'];
  const FORMATS = [[1040, 1280], [1180, 1180], [1300, 1020]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── GROUND wash: faint vertical tone, warmer toward the sun side ──
    const sunSide = r() < 0.5 ? -1 : 1;                 // -1 sun-left, +1 sun-right
    const sunX = sunSide < 0 ? W * (0.10 + r() * 0.07) : W * (0.83 + r() * 0.07);
    const sunY = H * (0.13 + r() * 0.12);               // low sun, near top
    // shadow vector: away from sun, long & raking (toward bottom of frame)
    const shA = sunSide < 0 ? (0.18 + r() * 0.16) : (Math.PI - 0.18 - r() * 0.16); // base ray angle
    const shLen = 2.4 + r() * 1.6;                       // shadow length multiplier

    const gg = x.createLinearGradient(0, 0, 0, H);
    gg.addColorStop(0, K.mix(pal.ground, pal.lit, 0.10));
    gg.addColorStop(0.55, pal.ground);
    gg.addColorStop(1, K.mix(pal.ground, pal.core, 0.22));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // sun-side warm wash
    const sw = x.createLinearGradient(sunSide < 0 ? 0 : W, 0, sunSide < 0 ? W : 0, H);
    sw.addColorStop(0, K.rgba(K.mix(pal.ground, pal.sun, 0.5), 0.22));
    sw.addColorStop(0.5, K.rgba(pal.sun, 0.0));
    x.fillStyle = sw; x.fillRect(0, 0, W, H);

    // ── DATUM line (horizon/baseline) ──
    const datum = H * (0.30 + r() * 0.10);
    x.strokeStyle = K.rgba(pal.ink, 0.30); x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(0, datum); x.lineTo(W, datum); x.stroke();

    // ── CALIBRATION GROUND (mode-dependent: grid or protractor) ──
    const useDial = (mode === 'Dial');
    const groundCx = W * (0.5 + (r() - 0.5) * 0.2), groundCy = H * (0.62 + r() * 0.1);
    if (useDial) {
      drawProtractor(x, pal, groundCx, groundCy, S, r, sunSide);
    } else {
      drawGrid(x, pal, W, H, datum, S, r, mode);
    }

    // monospace numeral helper (sparse)
    function numeral(tx, ty, str, size, a) {
      x.save();
      x.fillStyle = K.rgba(pal.ink, a == null ? 0.72 : Math.min(0.85, a + 0.22));
      x.font = (size || 12) + 'px "DejaVu Sans Mono", monospace';
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      // faint letterspacing feel via slight shadow for legibility on any ground
      x.shadowColor = K.rgba(pal.lit, 0.5); x.shadowBlur = 2;
      x.fillText(str, tx, ty); x.restore();
    }

    /* ───────────── SOLID + SHADOW PRIMITIVES ─────────────
       Each solid is matte/chalky with a lit face, a mid face, a core face,
       plus a contact AO smudge. The cast shadow is a separate flat tapering
       shape — and that is where the LIE is injected. */

    // flat tapering shadow polygon from a footprint, projected along (ang,len)
    function castShadow(footprint, ang, lenMul, baseH, override) {
      // footprint: array of [x,y] ground-contact points (the silhouette base)
      // project each point along the ray; far end tapers/shears slightly
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const L = baseH * lenMul;
      x.save();
      x.globalAlpha = 1;
      x.fillStyle = K.rgba(pal.shadow, pal.shadowA);
      x.beginPath();
      if (override) {
        // surreal: draw an unrelated silhouette as the shadow at the far end
        override(dx, dy, L);
      } else {
        const pts = footprint;
        x.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
        // far edge = footprint projected
        for (let i = pts.length - 1; i >= 0; i--) {
          x.lineTo(pts[i][0] + dx * L, pts[i][1] + Math.abs(dy) * L * 0.85);
        }
        x.closePath();
      }
      x.fill();
      x.restore();
    }

    // chalky face fill with a subtle gradient toward the sun
    function faceGrad(x0, y0, x1, y1, top, bot) {
      const g = x.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, top); g.addColorStop(1, bot); return g;
    }

    // CUBE / BOX: lit front, mid side, light top
    function cube(bx, by, w, h, depth, dir) {
      // by = top of front face; sits on ground at by+h
      const dpx = -dir * depth, dpy = -depth * 0.52;
      // top
      x.fillStyle = faceGrad(bx, by + dpy, bx, by, K.mix(pal.lit, pal.sun, 0.10), pal.lit);
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + w, by);
      x.lineTo(bx + w + dpx, by + dpy); x.lineTo(bx + dpx, by + dpy); x.closePath(); x.fill();
      // front (lit) face
      x.fillStyle = faceGrad(bx, by, bx, by + h, pal.lit, K.mix(pal.lit, pal.mid, 0.5));
      x.fillRect(bx, by, w, h);
      // side (mid / core) face
      const sx = dir < 0 ? bx : bx + w;
      x.fillStyle = faceGrad(sx, by, sx + dpx, by + h, pal.mid, pal.core);
      x.beginPath(); x.moveTo(sx, by); x.lineTo(sx + dpx, by + dpy);
      x.lineTo(sx + dpx, by + h + dpy); x.lineTo(sx, by + h); x.closePath(); x.fill();
      K.mottle(x, bx, by, w, h, pal.lit, 34, r, 'overlay');
      return [[bx, by + h], [bx + w, by + h]]; // ground footprint
    }

    // CYLINDER: vertical, soft barrel shading, elliptical top
    function cylinder(cx, baseY, rad, h, dir) {
      const topY = baseY - h, ery = rad * 0.34;
      // body barrel gradient (lit edge toward sun)
      const lg = dir < 0
        ? faceGrad(cx - rad, 0, cx + rad, 0, pal.lit, pal.core)
        : faceGrad(cx + rad, 0, cx - rad, 0, pal.lit, pal.core);
      x.fillStyle = lg;
      x.beginPath();
      x.moveTo(cx - rad, topY); x.lineTo(cx - rad, baseY);
      x.ellipse(cx, baseY, rad, ery, 0, Math.PI, 0, true);
      x.lineTo(cx + rad, topY);
      x.ellipse(cx, topY, rad, ery, 0, 0, Math.PI, true);
      x.closePath(); x.fill();
      // top ellipse cap (brightest)
      x.fillStyle = K.mix(pal.lit, pal.sun, 0.08);
      x.beginPath(); x.ellipse(cx, topY, rad, ery, 0, 0, Math.PI * 2); x.fill();
      // hairline contour so the machined form stays crisp on bright grounds
      x.strokeStyle = K.rgba(pal.core, 0.5); x.lineWidth = 1;
      x.beginPath(); x.ellipse(cx, topY, rad, ery, 0, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(cx - rad, topY); x.lineTo(cx - rad, baseY); x.stroke();
      x.beginPath(); x.moveTo(cx + rad, topY); x.lineTo(cx + rad, baseY); x.stroke();
      // core-shadow band on the away side
      x.save(); x.globalAlpha = 0.5;
      x.fillStyle = K.rgba(pal.core, 0.55);
      x.beginPath();
      const o = dir < 0 ? 1 : -1;
      x.moveTo(cx + o * rad * 0.45, topY); x.lineTo(cx + o * rad, topY);
      x.lineTo(cx + o * rad, baseY); x.lineTo(cx + o * rad * 0.45, baseY); x.closePath(); x.fill();
      x.restore();
      K.mottle(x, cx - rad, topY, rad * 2, h, pal.lit, 38, r, 'overlay');
      return [[cx - rad, baseY], [cx + rad, baseY]];
    }

    // SPHERE: radial chalky shading, lit lobe toward sun
    function sphere(cx, cy, rad, dir) {
      const lx = cx - dir * rad * 0.4, ly = cy - rad * 0.4;
      const g = x.createRadialGradient(lx, ly, rad * 0.1, cx, cy, rad * 1.15);
      g.addColorStop(0, K.mix(pal.lit, pal.sun, 0.06));
      g.addColorStop(0.45, pal.lit);
      g.addColorStop(0.78, pal.mid);
      g.addColorStop(1, pal.core);
      x.fillStyle = g;
      x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
      // terminator core-shadow crescent
      x.save(); x.globalAlpha = 0.4; x.fillStyle = K.rgba(pal.core, 0.6);
      x.beginPath(); x.arc(cx + dir * rad * 0.55, cy + rad * 0.25, rad * 0.95, 0, 7); x.clip();
      x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill(); x.restore();
      K.mottle(x, cx - rad, cy - rad, rad * 2, rad * 2, pal.lit, 40, r, 'overlay');
      return [[cx - rad, cy + rad], [cx + rad, cy + rad]];
    }

    // CONE
    function cone(cx, baseY, rad, h, dir) {
      const apex = baseY - h, ery = rad * 0.30;
      x.fillStyle = dir < 0
        ? faceGrad(cx - rad, 0, cx + rad, 0, pal.lit, pal.core)
        : faceGrad(cx + rad, 0, cx - rad, 0, pal.lit, pal.core);
      x.beginPath(); x.moveTo(cx, apex);
      x.lineTo(cx - rad, baseY); x.ellipse(cx, baseY, rad, ery, 0, Math.PI, 0, true);
      x.lineTo(cx + rad, baseY); x.closePath(); x.fill();
      x.fillStyle = K.mix(pal.mid, pal.core, 0.3);
      x.beginPath(); x.ellipse(cx, baseY, rad, ery, 0, 0, Math.PI * 2); x.fill();
      K.mottle(x, cx - rad, apex, rad * 2, h, pal.lit, 40, r, 'overlay');
      return [[cx - rad, baseY], [cx + rad, baseY]];
    }

    // WEDGE (triangular prism, machined ramp)
    function wedge(bx, by, w, h, depth, dir) {
      const dpx = -dir * depth, dpy = -depth * 0.5;
      // front triangle (lit)
      x.fillStyle = faceGrad(bx, by, bx, by + h, pal.lit, K.mix(pal.lit, pal.mid, 0.55));
      x.beginPath(); x.moveTo(bx, by + h); x.lineTo(bx + w, by + h);
      x.lineTo(bx + (dir < 0 ? 0 : w), by); x.closePath(); x.fill();
      // back/side
      x.fillStyle = pal.mid;
      const tipx = bx + (dir < 0 ? 0 : w);
      x.beginPath(); x.moveTo(tipx, by); x.lineTo(tipx + dpx, by + dpy);
      x.lineTo(bx + w + dpx, by + h + dpy); x.lineTo(bx + w, by + h); x.closePath(); x.fill();
      x.fillStyle = pal.core;
      x.beginPath(); x.moveTo(tipx, by); x.lineTo(tipx + dpx, by + dpy);
      x.lineTo(bx + dpx, by + h + dpy); x.lineTo(bx, by + h); x.closePath(); x.fill();
      K.mottle(x, bx, by, w, h, pal.lit, 36, r, 'overlay');
      return [[bx, by + h], [bx + w, by + h]];
    }

    // GNOMON ROD: thin vertical rod with a small base
    function gnomon(cx, baseY, h, thick) {
      x.fillStyle = K.rgba(pal.ink, 0.2);
      x.beginPath(); x.ellipse(cx, baseY, thick * 2.4, thick * 0.9, 0, 0, 7); x.fill();
      x.fillStyle = faceGrad(cx - thick, 0, cx + thick, 0, pal.lit, pal.core);
      x.fillRect(cx - thick, baseY - h, thick * 2, h);
      x.fillStyle = K.mix(pal.lit, pal.sun, 0.1);
      x.beginPath(); x.arc(cx, baseY - h, thick * 1.1, 0, 7); x.fill();
      return [[cx - thick, baseY], [cx + thick, baseY]];
    }

    // PLATONIC (octahedron-ish faceted gem)
    function platonic(cx, cy, rad, dir) {
      const top = [cx, cy - rad], bot = [cx, cy + rad];
      const l = [cx - rad * 0.86, cy], rr = [cx + rad * 0.86, cy], mid = [cx, cy + rad * 0.06];
      const litSide = dir < 0 ? l : rr, darkSide = dir < 0 ? rr : l;
      // lit top-left facet
      x.fillStyle = pal.lit;
      x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(litSide[0], litSide[1]); x.lineTo(mid[0], mid[1]); x.closePath(); x.fill();
      // mid top-right facet
      x.fillStyle = pal.mid;
      x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(darkSide[0], darkSide[1]); x.lineTo(mid[0], mid[1]); x.closePath(); x.fill();
      // lower lit facet
      x.fillStyle = K.mix(pal.lit, pal.mid, 0.5);
      x.beginPath(); x.moveTo(bot[0], bot[1]); x.lineTo(litSide[0], litSide[1]); x.lineTo(mid[0], mid[1]); x.closePath(); x.fill();
      // lower core facet
      x.fillStyle = pal.core;
      x.beginPath(); x.moveTo(bot[0], bot[1]); x.lineTo(darkSide[0], darkSide[1]); x.lineTo(mid[0], mid[1]); x.closePath(); x.fill();
      return [[l[0], cy + rad * 0.2], [rr[0], cy + rad * 0.2]];
    }

    // contact AO under a footprint
    function contact(fp) {
      const c = [(fp[0][0] + fp[1][0]) / 2, (fp[0][1] + fp[1][1]) / 2];
      K.softShadow(x, c[0], c[1] + 2, (fp[1][0] - fp[0][0]) * 0.8 + 6, 0.28);
    }

    // shape silhouette generators for the LIE (drawn at far end of a ray)
    function silSquare(cx, cy, s) { x.rect(cx - s, cy - s, s * 2, s * 2); }
    function silCircle(cx, cy, s) { x.moveTo(cx + s, cy); x.arc(cx, cy, s, 0, 7); }
    function silTri(cx, cy, s) { x.moveTo(cx, cy - s); x.lineTo(cx + s, cy + s); x.lineTo(cx - s, cy + s); x.closePath(); }
    function silStar(cx, cy, s) {
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? s * 0.45 : s; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath();
    }
    const sils = [silSquare, silCircle, silTri, silStar];

    // draw a precise tapering cast shadow, OR a lying one (mismatched silhouette
    // and/or wrong direction). Returns nothing; draws shadow under solid.
    function shadowFor(fp, h, opts) {
      opts = opts || {};
      const ang = opts.ang != null ? opts.ang : shA;
      const L = h * (opts.lenMul != null ? opts.lenMul : shLen);
      const dx = Math.cos(ang), dy = Math.max(0.30, Math.abs(Math.sin(ang)) * 0.4 + 0.42);
      const w = fp[1][0] - fp[0][0];
      const fpA = K.rgba(pal.shadow, pal.shadowA * (opts.alpha || 1));
      x.save();
      x.fillStyle = fpA;
      if (opts.lie) {
        // THE LIE: shadow leaves the footprint as a normal tapering band, then
        // RESOLVES into a crisp, unmistakably DIFFERENT silhouette at its end.
        const fcx = (fp[0][0] + fp[1][0]) / 2, fcy = (fp[0][1] + fp[1][1]) / 2;
        const reach = L * 0.62;               // band travels most of the way
        const ncx = fcx + dx * reach, ncy = fcy + dy * reach;
        const s = w * 0.72 * (0.9 + r() * 0.3);
        if (!opts.detach) {
          // tapering neck, ending narrow just before the planted shape
          const taper = w * 0.28;
          x.beginPath();
          x.moveTo(fp[0][0], fp[0][1]); x.lineTo(fp[1][0], fp[1][1]);
          x.lineTo(ncx + (w / 2 - taper), ncy); x.lineTo(ncx - (w / 2 - taper), ncy);
          x.closePath(); x.fill();
        }
        // crisp planted silhouette at the very end (a clearly wrong shape)
        const ecx = fcx + dx * L, ecy = fcy + dy * L;
        const sil = opts.sil || K.pick(sils, r);
        x.fillStyle = K.rgba(pal.shadow, Math.min(0.66, pal.shadowA + 0.16));
        x.beginPath(); sil(ecx, ecy, s); x.fill();
        // crisp diagrammatic outline so the wrong shape reads sharply
        x.strokeStyle = K.rgba(pal.shadow, Math.min(0.62, pal.shadowA + 0.22));
        x.lineWidth = 1.2;
        x.beginPath(); sil(ecx, ecy, s); x.stroke();
      } else {
        // honest TAPERING shadow: wide at the base, narrowing toward the tip,
        // with a crisp diagrammatic outline. Far edge inset = precise taper.
        const ax = fp[0][0] + dx * L, ay = fp[0][1] + dy * L;
        const bx = fp[1][0] + dx * L, by = fp[1][1] + dy * L;
        const taper = w * 0.30;               // shrink far edge inward
        x.beginPath();
        x.moveTo(fp[0][0], fp[0][1]); x.lineTo(fp[1][0], fp[1][1]);
        x.lineTo(bx - taper, by); x.lineTo(ax + taper, ay);
        x.closePath(); x.fill();
        // crisp edge stroke for the diagrammatic, measured feel
        x.strokeStyle = K.rgba(pal.shadow, Math.min(0.55, pal.shadowA + 0.18));
        x.lineWidth = 1; x.stroke();
      }
      x.restore();
    }

    /* ───────────── COMPOSE PER MODE ─────────────
       Order: shadows first (so solids sit on top), then solids, then AO. */

    if (mode === 'Gnomon') {
      // single rod + a FAN of hour-shadows radiating at degree ticks
      const cx = W * 0.5, baseY = datum + (H - datum) * 0.18;
      const h = (H - datum) * (0.42 + r() * 0.12);
      const fan = 5 + (r() * 3 | 0);
      const spread = (sunSide < 0 ? 1 : -1);
      const a0 = sunSide < 0 ? 0.12 : Math.PI - 0.12;
      const aSpan = 0.95 + r() * 0.4;
      for (let i = 0; i < fan; i++) {
        const t = i / (fan - 1);
        const ang = a0 + spread * t * aSpan * 0; // keep base then rotate
        const a = a0 + (spread) * (t - 0.5) * aSpan;
        const L = h * (shLen * (0.7 + t * 0.6));
        const dx = Math.cos(a), dy = Math.max(0.3, Math.sin(a) * 0.5 + 0.5);
        x.save();
        x.strokeStyle = K.rgba(pal.shadow, pal.shadowA * (0.4 + 0.5 * (1 - Math.abs(t - 0.5) * 2)));
        x.lineWidth = 2.2 + (1 - t) * 2;
        x.beginPath(); x.moveTo(cx, baseY); x.lineTo(cx + dx * L, baseY + dy * L * 0.5); x.stroke();
        x.restore();
        // tick numeral at shadow tip (hour angle)
        numeral(cx + dx * L - 8, baseY + dy * L * 0.5 + 14, (60 + i * 15) + '°', 11, 0.42);
      }
      const fp = gnomon(cx, baseY, h, S * 0.012);
      contact(fp);
      numeral(cx + S * 0.03, baseY - h + 4, 'GNOMON', 12, 0.5);
      numeral(W * 0.06, datum - 8, 'SUN ALT 12°', 12, 0.45);

    } else if (mode === 'Solids') {
      // cluster of 2–4 solids, long honest shadows (one quiet lie)
      const n = 2 + (r() * 3 | 0);
      const baseY = datum + (H - datum) * (0.30 + r() * 0.12);
      const lieIdx = (r() * n) | 0;
      const slots = [];
      for (let i = 0; i < n; i++) slots.push(W * (0.22 + (i + 0.5) / n * 0.56) + (r() - 0.5) * W * 0.05);
      const items = [];
      for (let i = 0; i < n; i++) {
        const kind = (r() * 6) | 0;
        const sc = 0.7 + r() * 0.5;
        items.push({ x: slots[i], kind, sc, lie: i === lieIdx });
      }
      // shadows first
      for (const it of items) {
        const h = (H - datum) * 0.3 * it.sc;
        const w = S * 0.10 * it.sc;
        const fp = [[it.x - w / 2, baseY], [it.x + w / 2, baseY]];
        shadowFor(fp, h, { lie: it.lie });
      }
      // solids
      for (const it of items) {
        const dir = sunSide;
        const h = (H - datum) * 0.3 * it.sc, w = S * 0.10 * it.sc;
        let fp;
        if (it.kind === 0) fp = cube(it.x - w / 2, baseY - h, w, h, w * 0.5, dir);
        else if (it.kind === 1) fp = cylinder(it.x, baseY, w * 0.5, h, dir);
        else if (it.kind === 2) fp = sphere(it.x, baseY - w * 0.5, w * 0.5, dir);
        else if (it.kind === 3) fp = cone(it.x, baseY, w * 0.5, h, dir);
        else if (it.kind === 4) fp = wedge(it.x - w / 2, baseY - h, w, h, w * 0.4, dir);
        else fp = platonic(it.x, baseY - w * 0.55, w * 0.5, dir);
        contact(fp);
      }
      numeral(W * 0.06, datum - 8, 'PLAN — 09:40', 12, 0.45);

    } else if (mode === 'Conflict') {
      // the surreal star: multiple solids, mismatched/contradictory shadows
      const baseY = datum + (H - datum) * (0.32 + r() * 0.10);
      const xs = [W * 0.28, W * 0.5, W * 0.72];
      const angs = [0.18, Math.PI - 0.2, 0.5];               // contradictory directions
      const kinds = K.shuffle([0, 1, 2, 3, 4, 5], r);
      for (let i = 0; i < 3; i++) {
        const h = (H - datum) * (0.26 + r() * 0.08), w = S * (0.085 + r() * 0.02);
        const fp = [[xs[i] - w / 2, baseY], [xs[i] + w / 2, baseY]];
        // every shadow lies: wrong direction AND/OR wrong shape
        const lie = r() < 0.7;
        shadowFor(fp, h, { ang: angs[i], lie: lie, sil: sils[i % sils.length], lenMul: shLen * (0.9 + r() * 0.5) });
      }
      for (let i = 0; i < 3; i++) {
        const dir = sunSide; const h = (H - datum) * (0.26 + r() * 0.08), w = S * (0.085 + r() * 0.02);
        const k = kinds[i]; let fp;
        if (k === 0) fp = cube(xs[i] - w / 2, baseY - h, w, h, w * 0.5, dir);
        else if (k === 1) fp = cylinder(xs[i], baseY, w * 0.5, h, dir);
        else if (k === 2) fp = sphere(xs[i], baseY - w * 0.5, w * 0.5, dir);
        else if (k === 3) fp = cone(xs[i], baseY, w * 0.5, h, dir);
        else if (k === 4) fp = wedge(xs[i] - w / 2, baseY - h, w, h, w * 0.4, dir);
        else fp = platonic(xs[i], baseY - w * 0.55, w * 0.5, dir);
        contact(fp);
      }
      numeral(W * 0.06, datum - 8, 'TWO SUNS?', 12, 0.5);

    } else if (mode === 'Dial') {
      // concentric protractor arcs (already drawn) + one solid throwing a shadow
      // across the ticks — the shadow detaches / wrong shape
      const cx = groundCx, baseY = groundCy - S * 0.02;
      const h = (H - datum) * (0.30 + r() * 0.10), w = S * 0.11;
      const fp = [[cx - w / 2, baseY], [cx + w / 2, baseY]];
      shadowFor(fp, h, { ang: shA, lie: r() < 0.6, lenMul: shLen * 1.1 });
      const dir = sunSide; const k = (r() * 4) | 0; let f;
      if (k === 0) f = cube(cx - w / 2, baseY - h, w, h, w * 0.5, dir);
      else if (k === 1) f = cylinder(cx, baseY, w * 0.5, h, dir);
      else if (k === 2) f = cone(cx, baseY, w * 0.5, h, dir);
      else f = platonic(cx, baseY - w * 0.55, w * 0.5, dir);
      contact(f);
      numeral(cx - S * 0.02, groundCy + S * 0.34, 'AZIMUTH', 12, 0.5);

    } else if (mode === 'Field') {
      // measured grid of identical solids, shadows lengthening across the frame
      const cols = 3 + (r() * 2 | 0), rows = 3 + (r() * 2 | 0);
      const kind = (r() * 5) | 0;
      const x0 = W * 0.16, x1 = W * 0.84, y0 = datum + (H - datum) * 0.18, y1 = H * 0.9;
      const w = (x1 - x0) / cols * 0.42;
      // shadows lengthen left→right (sun lower as you cross)
      for (let ry = 0; ry < rows; ry++) {
        for (let cx0 = 0; cx0 < cols; cx0++) {
          const px = x0 + (cx0 + 0.5) / cols * (x1 - x0);
          const py = y0 + (ry + 0.5) / rows * (y1 - y0);
          const h = (H - datum) * 0.16;
          const lm = shLen * (0.5 + (cx0 / (cols - 1)) * 1.6);
          const fp = [[px - w / 2, py], [px + w / 2, py]];
          // one rogue cell lies
          const lie = (ry === (rows >> 1) && cx0 === (cols - 1));
          shadowFor(fp, h, { lenMul: lm, lie: lie });
        }
      }
      for (let ry = 0; ry < rows; ry++) {
        for (let cx0 = 0; cx0 < cols; cx0++) {
          const px = x0 + (cx0 + 0.5) / cols * (x1 - x0);
          const py = y0 + (ry + 0.5) / rows * (y1 - y0);
          const h = (H - datum) * 0.16; const dir = sunSide; let fp;
          if (kind === 0) fp = cube(px - w / 2, py - h, w, h, w * 0.45, dir);
          else if (kind === 1) fp = cylinder(px, py, w * 0.5, h, dir);
          else if (kind === 2) fp = cone(px, py, w * 0.5, h, dir);
          else if (kind === 3) fp = wedge(px - w / 2, py - h, w, h, w * 0.35, dir);
          else fp = platonic(px, py - w * 0.5, w * 0.45, dir);
          contact(fp);
        }
      }
      numeral(W * 0.06, datum - 8, 'FIELD 5×5', 12, 0.45);

    } else { // Section — one solid bisected by a bright light-plane
      const cx = W * 0.5, baseY = datum + (H - datum) * (0.40 + r() * 0.08);
      const h = (H - datum) * 0.42, w = S * 0.16;
      const fp = [[cx - w / 2, baseY], [cx + w / 2, baseY]];
      shadowFor(fp, h, { ang: shA, lie: r() < 0.5, lenMul: shLen });
      const dir = sunSide; const k = (r() * 3) | 0; let f;
      if (k === 0) f = cube(cx - w / 2, baseY - h, w, h, w * 0.5, dir);
      else if (k === 1) f = cylinder(cx, baseY, w * 0.5, h, dir);
      else f = platonic(cx, baseY - w * 0.6, w * 0.55, dir);
      contact(f);
      // bright vertical light-plane bisecting it
      const planeX = cx + (r() - 0.5) * w * 0.4;
      const lp = x.createLinearGradient(planeX - 18, 0, planeX + 18, 0);
      lp.addColorStop(0, K.rgba(pal.sun, 0));
      lp.addColorStop(0.5, K.rgba(K.mix(pal.sun, '#ffffff', 0.4), 0.5));
      lp.addColorStop(1, K.rgba(pal.sun, 0));
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = lp; x.fillRect(planeX - 18, datum * 0.4, 36, H); x.restore();
      // section hatching on the cut line
      x.save(); x.strokeStyle = K.rgba(pal.ink, 0.35); x.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const yy = baseY - h + i / 8 * h; x.beginPath(); x.moveTo(planeX - 6, yy); x.lineTo(planeX + 6, yy + 6); x.stroke(); }
      x.restore();
      numeral(planeX + 22, datum + 16, 'SECTION A-A', 12, 0.5);
    }

    // ── SUN: soft warm bloom + faint disc, low (kept restrained, never blown out) ──
    K.bloom(x, sunX, sunY, S * (0.42 + r() * 0.18), pal.sun, 0.26);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = K.rgba(pal.sun, 0.42);
    x.beginPath(); x.arc(sunX, sunY, S * (0.024 + r() * 0.014), 0, 7); x.fill();
    x.restore();
    // thin ray-angle annotation line from sun
    x.save(); x.strokeStyle = K.rgba(pal.sun, 0.18); x.lineWidth = 1; x.setLineDash([5, 6]);
    x.beginPath(); x.moveTo(sunX, sunY); x.lineTo(W * 0.5, datum); x.stroke(); x.restore();

    // ── ATMOSPHERE & TEXTURE GRADE ──
    const hazeCol = K.mix(pal.ground, pal.sun, 0.28);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.16, S * 0.95, 'screen');
    // low ground haze along the datum
    const gh = x.createLinearGradient(0, datum - H * 0.03, 0, datum + H * 0.10);
    gh.addColorStop(0, K.rgba(hazeCol, 0));
    gh.addColorStop(0.5, K.rgba(hazeCol, 0.30));
    gh.addColorStop(1, K.rgba(hazeCol, 0));
    x.fillStyle = gh; x.fillRect(0, datum - H * 0.03, W, H * 0.13);
    K.grain(x, W, H, 6, r);
    K.vignette(x, W, H, pal.name === 'Blue Hour' ? 0.42 : 0.30);

    return { aspect: W / H };
  }

  /* faint measured graph grid + datum ticks */
  function drawGrid(x, pal, W, H, datum, S, r, mode) {
    const K = window.KIT;
    const g = S * (0.045 + r() * 0.015);
    x.save();
    x.strokeStyle = K.rgba(pal.grid, 0.45); x.lineWidth = 1;
    for (let gx = (W * 0.5) % g; gx < W; gx += g) { x.beginPath(); x.moveTo(gx, datum); x.lineTo(gx, H); x.stroke(); }
    for (let gy = datum; gy < H; gy += g) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
    // bolder every 5th column + row
    x.strokeStyle = K.rgba(pal.grid, 0.72); x.lineWidth = 1.6;
    for (let i = 0, gx = (W * 0.5) % g; gx < W; gx += g, i++) if (i % 5 === 0) { x.beginPath(); x.moveTo(gx, datum); x.lineTo(gx, H); x.stroke(); }
    for (let i = 0, gy = datum; gy < H; gy += g, i++) if (i % 5 === 0) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
    // datum degree ticks
    x.strokeStyle = K.rgba(pal.tick, 0.7); x.lineWidth = 1.3;
    for (let tx = g * 0.5; tx < W; tx += g * 0.5) { x.beginPath(); x.moveTo(tx, datum - 5); x.lineTo(tx, datum + 5); x.stroke(); }
    x.restore();
  }

  /* concentric protractor arcs with degree ticks (Dial mode ground) */
  function drawProtractor(x, pal, cx, cy, S, r, sunSide) {
    const K = window.KIT;
    x.save();
    const R0 = S * 0.12, R1 = S * 0.36;
    const rings = 3 + (r() * 2 | 0);
    for (let i = 0; i < rings; i++) {
      const rad = R0 + (R1 - R0) * (i / (rings - 1));
      x.strokeStyle = K.rgba(pal.grid, 0.45 - i * 0.05); x.lineWidth = i === rings - 1 ? 1.6 : 1;
      x.beginPath(); x.arc(cx, cy, rad, Math.PI, Math.PI * 2); x.stroke();
    }
    // degree ticks around outer arc, every 10°, longer every 30°
    x.strokeStyle = K.rgba(pal.tick, 0.6);
    for (let d = 0; d <= 180; d += 5) {
      const a = Math.PI + (d / 180) * Math.PI;
      const long = d % 30 === 0, mid = d % 10 === 0;
      const tl = long ? S * 0.028 : mid ? S * 0.018 : S * 0.010;
      x.lineWidth = long ? 1.6 : 1;
      const ix = cx + Math.cos(a) * R1, iy = cy + Math.sin(a) * R1;
      const ox = cx + Math.cos(a) * (R1 + tl), oy = cy + Math.sin(a) * (R1 + tl);
      x.beginPath(); x.moveTo(ix, iy); x.lineTo(ox, oy); x.stroke();
      if (long) {
        x.save(); x.fillStyle = K.rgba(pal.ink, 0.5);
        x.font = (S * 0.018 | 0) + 'px "DejaVu Sans Mono", monospace';
        x.textAlign = 'center';
        const lx = cx + Math.cos(a) * (R1 + tl + S * 0.022), ly = cy + Math.sin(a) * (R1 + tl + S * 0.022) + 4;
        x.fillText(d + '', lx, ly); x.restore();
      }
    }
    // center datum dot
    x.fillStyle = K.rgba(pal.ink, 0.5); x.beginPath(); x.arc(cx, cy, S * 0.006, 0, 7); x.fill();
    x.restore();
  }

  function draw0() {}

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const hourMap = { 'Equinox': 'Equinox', 'Solstice': 'Solstice', 'Gnomon': 'Greyscale', 'Blue Hour': 'Blue Hour', 'Terracotta': 'Golden', 'Eclipse': 'Eclipse' };
    return { Palette: pal.name, Mode: mode, Format: f, Light: hourMap[pal.name] };
  }

  return { name: 's06_heliodon', draw, traits };
})();
