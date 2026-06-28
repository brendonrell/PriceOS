/* PLAYA — a cracked white salt-flat stretching to the horizon under twin suns.
 * Monumental radio antennae (thin dark verticals + guy-wires) and tilted
 * monoliths cast impossibly long shadows that point different ways. A mirage
 * shimmer band warps the horizon; dust haze sheets the air peach; a lone
 * figure-scale element gives the monuments their crushing scale.
 *
 * SURREAL: two suns, shadows pointing different directions, one monolith
 * floating a few inches off its own shadow, mirror-doubled horizon.
 *
 * Palette family — BLEACHED DESERT FUTURE: bleached peach #ffd9a8 /
 * alkaline mint #8fe0c8 / shadow indigo #2a2350. High-key, sun-blown, pale
 * but with saturated accents. The restraint piece: minimal but detailed.
 *
 * Depth: BG = sun-blown sky + twin sun blooms + hazy far monuments dissolving
 * into the horizon mirage. MID = monoliths + antennae with long shadows.
 * FG = cracked salt ground (fbm + crack lines) + figure-scale element. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways — all BLEACHED DESERT FUTURE; vary time-of-day & accent within
  // the peach / mint / indigo family.
  const PALS = [
    { name: 'High Noon',   sky:'#ffe9cf', skyTop:'#ffd9a8', salt:'#fbf3e6', saltLo:'#e7d8c4', shadow:'#2a2350', sun:'#fff4dc', sun2:'#ffd9a8', accent:'#8fe0c8', haze:'#ffd9a8' },
    { name: 'Alkaline',    sky:'#dff6ec', skyTop:'#b8ead8', salt:'#f2f7f1', saltLo:'#cfe2d6', shadow:'#243a4a', sun:'#fffbe8', sun2:'#8fe0c8', accent:'#8fe0c8', haze:'#bfeede' },
    { name: 'Indigo Dusk', sky:'#cab6d8', skyTop:'#9a86c4', salt:'#e7dcd0', saltLo:'#b6a3b0', shadow:'#1c1640', sun:'#ffe2c0', sun2:'#a98fd8', accent:'#ffc98f', haze:'#c8a8d0' },
    { name: 'Bleached',    sky:'#fff4e6', skyTop:'#ffe4c4', salt:'#fdf8f0', saltLo:'#ecdccb', shadow:'#3a3258', sun:'#ffffff', sun2:'#ffe9c4', accent:'#9be0cf', haze:'#ffe6cc' },
    { name: 'Mint Glare',  sky:'#e8f7ea', skyTop:'#c2ecd2', salt:'#f4f8ee', saltLo:'#d2e4cf', shadow:'#21404c', sun:'#fffce4', sun2:'#9be8c8', accent:'#ffcf9a', haze:'#cdf0dc' },
    { name: 'Ember Salt',  sky:'#ffe2c0', skyTop:'#ffc99a', salt:'#f6ead8', saltLo:'#dcc2a8', shadow:'#3a2050', sun:'#fff0d0', sun2:'#ff9e6a', accent:'#8fe0c8', haze:'#ffcfa0' },
  ];
  const FMTS = [ { W:1240, H:760, t:'Wide' }, { W:1240, H:830, t:'Pano' }, { W:1240, H:900, t:'Tall Sky' } ];
  const ANOM = ['Floating Monolith', 'Split Shadows', 'Mirror Horizon', 'Sun Eclipse'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      anom: K.pick(ANOM, r),
      density: K.rint(r, 6, 10),
      sunGap: 0.18 + r() * 0.34,
      sunY: 0.14 + r() * 0.16,
      horizonT: 0.56 + r() * 0.16,
      focus: K.pick(['Left','Center','Right'], r),
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Anomaly: p.anom, Monuments: p.density, Horizon: p.focus };
  }

  // Long ground shadow: a soft dark wedge stretching from a base point toward
  // an angle, fading and widening — the impossibly-long salt-flat shadow.
  function longShadow(x, P, bx, by, len, ang, w0, w1, a, depth) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const ex = bx + dx * len, ey = by + dy * len;
    // perpendicular for width
    const px = -dy, py = dx;
    const g = x.createLinearGradient(bx, by, ex, ey);
    g.addColorStop(0, K.rgba(P.shadow, a * (0.6 + depth * 0.4)));
    g.addColorStop(0.5, K.rgba(P.shadow, a * 0.4));
    g.addColorStop(1, K.rgba(P.shadow, 0));
    x.save(); x.globalCompositeOperation = 'multiply';
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(bx + px * w0, by + py * w0);
    x.lineTo(bx - px * w0, by - py * w0);
    x.lineTo(ex - px * w1, ey - py * w1);
    x.lineTo(ex + px * w1, ey + py * w1);
    x.closePath(); x.fill();
    x.restore();
  }

  // A tilted monolith — a tall thin slab, slightly leaning, with a sunlit edge
  // and shaded face. Depth fades it toward the sky (atmospheric perspective).
  function monolith(x, P, bx, by, h, w, tilt, depth, r) {
    const fade = 1 - depth; // far = high fade
    const lean = tilt * h; // horizontal offset at top
    const topX = bx + lean;
    const topY = by - h;
    // body color: indigo shadow slab, far ones wash toward haze
    const faceCol = K.mix(P.shadow, P.haze, 0.25 + fade * 0.55);
    const litCol = K.mix(P.sun, P.haze, 0.1 + fade * 0.4);
    const wHalf = w / 2;
    // shaded face (parallelogram)
    x.fillStyle = faceCol;
    x.beginPath();
    x.moveTo(bx - wHalf, by);
    x.lineTo(topX - wHalf, topY);
    x.lineTo(topX + wHalf * 0.2, topY);
    x.lineTo(bx + wHalf * 0.2, by);
    x.closePath(); x.fill();
    // lit edge sliver
    x.fillStyle = litCol;
    x.beginPath();
    x.moveTo(bx + wHalf * 0.2, by);
    x.lineTo(topX + wHalf * 0.2, topY);
    x.lineTo(topX + wHalf, topY);
    x.lineTo(bx + wHalf, by);
    x.closePath(); x.fill();
    // subtle vertical streak texture on the face
    x.save(); x.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 3; i++) {
      const t = 0.2 + r() * 0.6;
      x.strokeStyle = K.rgba(P.shadow, 0.05 * depth);
      x.lineWidth = 0.8;
      x.beginPath();
      x.moveTo(bx - wHalf + w * t, by);
      x.lineTo(topX - wHalf + w * t, topY);
      x.stroke();
    }
    x.restore();
    return { topX, topY, baseX: bx, baseY: by, w, h };
  }

  // A radio antenna — thin dark vertical mast with guy-wires fanning to the
  // ground and a blinking light bloom at the top.
  function antenna(x, P, bx, by, h, depth, r, accent) {
    const fade = 1 - depth;
    const topY = by - h;
    const col = K.mix(P.shadow, P.haze, 0.15 + fade * 0.6);
    const lw = Math.max(1, (1.4 + depth * 2.2));
    // guy-wires first (behind mast)
    x.save(); x.strokeStyle = K.rgba(col, 0.35 + depth * 0.25); x.lineWidth = Math.max(0.5, lw * 0.4);
    const spread = h * (0.3 + r() * 0.2);
    for (const s of [-1, 1]) {
      x.beginPath();
      x.moveTo(bx, topY + h * 0.12);
      x.lineTo(bx + s * spread, by);
      x.stroke();
      // mid guy
      x.beginPath();
      x.moveTo(bx, topY + h * 0.45);
      x.lineTo(bx + s * spread * 0.6, by);
      x.stroke();
    }
    x.restore();
    // mast
    x.strokeStyle = col; x.lineWidth = lw;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, topY); x.stroke();
    // lattice cross-ticks on nearer masts
    if (depth > 0.4) {
      x.lineWidth = Math.max(0.5, lw * 0.5);
      for (let yy = topY + 6; yy < by - 4; yy += 8 + r() * 6) {
        x.beginPath(); x.moveTo(bx - lw * 1.4, yy); x.lineTo(bx + lw * 1.4, yy + 3); x.stroke();
      }
    }
    // blinking beacon light at top
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = K.rgba(accent, 0.9);
    x.beginPath(); x.arc(bx, topY, Math.max(1.2, lw * 0.9), 0, 7); x.fill();
    x.restore();
    K.bloom(x, bx, topY, 6 + depth * 14, accent, 0.4 + depth * 0.3);
    return { bx, by, topY, h };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const horizon = H * p.horizonT;

    // ── SKY: high-key sun-blown gradient, palest at the horizon. Keep the top
    //    SATURATED so it doesn't blow to grey; the bleach happens near horizon ──
    {
      const g = x.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, K.mix(P.skyTop, P.shadow, 0.12));
      g.addColorStop(0.35, P.skyTop);
      g.addColorStop(0.75, P.sky);
      g.addColorStop(1, K.mix(P.sky, '#ffffff', 0.42));
      x.fillStyle = g; x.fillRect(0, 0, W, horizon);
    }

    // ── TWIN SUNS: two blooms near the top, one dominant ──
    const focusX = p.focus === 'Left' ? 0.32 : p.focus === 'Right' ? 0.68 : 0.5;
    const sun1x = W * (focusX - p.sunGap * 0.5);
    const sun2x = W * (focusX + p.sunGap * 0.5);
    const sunY = H * p.sunY;
    function paintSun(sx, big, col, eclipse) {
      const R = (big ? 40 : 26) + (W / 1240) * (big ? 14 : 7);
      // broad atmospheric glow — tighter so it doesn't bleach the whole sky
      K.bloom(x, sx, sunY, R * (big ? 5.5 : 4), col, 0.14);
      K.bloom(x, sx, sunY, R * 2.4, col, 0.26);
      // a saturated ring of warm color around the disc (corona) before the white core
      K.bloom(x, sx, sunY, R * 1.5, K.mix(col, P.accent, big ? 0.0 : 0.4), 0.3);
      K.sheen(x, sx, sunY, R * 1.6, K.mix(col, '#ffffff', 0.7), 0.55);
      // disc — bright but with a defined warm rim so it reads as a disc
      x.save(); x.globalCompositeOperation = 'lighter';
      const dg = x.createRadialGradient(sx, sunY, 0, sx, sunY, R);
      dg.addColorStop(0, K.rgba('#ffffff', 0.98));
      dg.addColorStop(0.6, K.rgba(K.mix(col, '#ffffff', 0.5), 0.9));
      dg.addColorStop(1, K.rgba(col, 0.55));
      x.fillStyle = dg;
      x.beginPath(); x.arc(sx, sunY, R, 0, 7); x.fill();
      x.restore();
      if (eclipse) {
        // surreal: a dark bite out of the sun
        x.save(); x.globalCompositeOperation = 'multiply';
        x.fillStyle = K.rgba(P.shadow, 0.7);
        x.beginPath(); x.arc(sx + R * 0.4, sunY - R * 0.3, R * 0.85, 0, 7); x.fill();
        x.restore();
        K.bloom(x, sx, sunY, R * 2.2, col, 0.3);
      }
    }
    const eclipse = p.anom === 'Sun Eclipse';
    paintSun(sun1x, true, P.sun, eclipse);
    paintSun(sun2x, false, P.sun2, false);

    // ── FAR HAZE: a peach dust sheet over the whole sky. Large scale + low
    //    opacity so the block-grid never shows as a checker on the flat sky ──
    K.hazeSheet(x, W, horizon, noise, P.haze, 0.12, 380, 'screen');

    // ── FAR MESA SILHOUETTES: a low, hazy ridge sitting on the horizon for
    //    background depth — desaturated toward the haze, atmospheric perspective ──
    {
      x.save();
      const ridges = K.rint(r, 1, 2);
      for (let rg = 0; rg < ridges; rg++) {
        const rcol = K.mix(P.shadow, P.haze, 0.62 + rg * 0.18);
        const baseY = horizon - H * (0.005 + rg * 0.012);
        const amp = H * (0.03 + r() * 0.03) * (1 - rg * 0.4);
        x.fillStyle = K.rgba(rcol, 0.5 - rg * 0.2);
        x.beginPath();
        x.moveTo(0, baseY);
        const segs = 14;
        for (let s = 0; s <= segs; s++) {
          const px = (s / segs) * W;
          const ny = baseY - Math.max(0, (noise.fbm(px / 160 + rg * 9, rg * 3.3, 4) + 0.3)) * amp
                     - (s % 4 === 0 ? r() * amp * 0.4 : 0);
          x.lineTo(px, ny);
        }
        x.lineTo(W, baseY); x.closePath(); x.fill();
      }
      x.restore();
    }

    // ── SALT GROUND base: pale & bright at horizon (sun glare reflection),
    //    deepening to a richer saltLo/shadow tint underfoot for contrast ──
    {
      const g = x.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, K.mix(P.salt, '#ffffff', 0.45));
      g.addColorStop(0.18, P.salt);
      g.addColorStop(0.6, K.mix(P.saltLo, P.accent, 0.08));
      g.addColorStop(1, K.mix(P.saltLo, P.shadow, 0.28));
      x.fillStyle = g; x.fillRect(0, horizon, W, H - horizon);
    }

    // ── SALT TEXTURE: pale fbm mottle + crack lines that recede with depth ──
    {
      // fbm patch shading — FINE, low-amplitude salt grain (not clouds).
      // Higher-frequency noise + stretched horizontally for a ground-plane feel,
      // and gentle so it never reads as blotchy cloud.
      const step = 4;
      x.save();
      for (let yy = horizon; yy < H; yy += step) {
        const depth = (yy - horizon) / (H - horizon); // 0 far → 1 near
        for (let xx = 0; xx < W; xx += step) {
          // two octaves: a broad faint stain + a fine salt crystal grain
          const broad = noise.fbm(xx / 220, (yy - horizon) / 70, 3, 0.5, 2);
          const fine = noise.fbm(xx / 26, (yy - horizon) / 14, 2, 0.6, 2.2);
          const tone = broad * (0.03 + depth * 0.05) + fine * (0.02 + depth * 0.06);
          const col = tone > 0 ? K.mix(P.salt, '#ffffff', K.clamp(tone * 3, 0, 0.5))
                               : K.mix(P.saltLo, P.shadow, K.clamp(-tone * 2, 0, 0.4));
          x.fillStyle = K.rgba(col, 0.12 + depth * 0.16);
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();

      // CRACK LINES: a polygonal network, denser & sharper in the foreground.
      // Each crack gets a bright salt rim beside the dark fissure → relief.
      x.save();
      const cracks = K.rint(r, 120, 200);
      for (let i = 0; i < cracks; i++) {
        const cy = horizon + Math.pow(r(), 0.5) * (H - horizon); // bias toward FG
        const depth = (cy - horizon) / (H - horizon);
        if (depth < 0.04) continue; // keep the far horizon clean
        const cx = r() * W;
        const segs = K.rint(r, 2, 6);
        const pts = [];
        let px = cx, py = cy;
        pts.push([px, py]);
        for (let s = 0; s < segs; s++) {
          const ll = (10 + r() * 46) * (0.3 + depth);
          const aa = r() * Math.PI * 2;
          px += Math.cos(aa) * ll;
          py += Math.sin(aa) * ll * 0.45; // flatten — ground plane perspective
          pts.push([px, py]);
        }
        // bright salt rim (offset slightly toward the sun side)
        x.strokeStyle = K.rgba(K.mix(P.salt, '#ffffff', 0.6), (0.05 + depth * 0.18));
        x.lineWidth = 0.5 + depth * 1.4;
        x.beginPath(); x.moveTo(pts[0][0] + 1, pts[0][1] - 0.6);
        for (let s = 1; s < pts.length; s++) x.lineTo(pts[s][0] + 1, pts[s][1] - 0.6);
        x.stroke();
        // dark fissure
        x.strokeStyle = K.rgba(P.shadow, (0.07 + depth * 0.26) * (0.6 + r() * 0.5));
        x.lineWidth = 0.5 + depth * 1.6;
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s < pts.length; s++) x.lineTo(pts[s][0], pts[s][1]);
        x.stroke();
      }
      x.restore();
    }

    // ── HORIZON MIRAGE BAND: a wavy reflective shimmer where the heat-haze
    //    turns the salt into a false lake. Bright sky-bleed + horizontal wobble
    //    streaks of accent + a crisp dark settle line for the true horizon. ──
    {
      const bandH = H * 0.06;
      const y0 = horizon - bandH * 0.55;
      // bright mirage sheen — peak brightness right at the horizon
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let yy = y0; yy < y0 + bandH; yy += 1) {
        const t = (yy - y0) / bandH;
        const env = Math.pow(1 - Math.abs(t - 0.5) * 2, 1.5);
        x.fillStyle = K.rgba(K.mix(P.haze, '#ffffff', 0.55), env * 0.55);
        x.fillRect(0, yy, W, 1.2);
      }
      // wavy displaced shimmer streaks (the actual mirage ripple)
      for (let i = 0; i < K.rint(r, 40, 70); i++) {
        const yy = y0 + r() * bandH;
        const t = (yy - y0) / bandH;
        const env = 1 - Math.abs(t - 0.5) * 2;
        const sx = r() * W;
        const len = 20 + r() * 90;
        const col = r() < 0.4 ? P.accent : K.mix(P.haze, '#ffffff', 0.6);
        x.fillStyle = K.rgba(col, env * (0.08 + r() * 0.14));
        x.fillRect(sx, yy, len, 0.8 + r() * 0.8);
      }
      x.restore();
      // thin dark settle line just under the horizon for crispness
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(P.shadow, 0.08);
      x.fillRect(0, horizon, W, 1.6);
      x.restore();
    }

    // ── MONUMENTS: build a back-to-front list so shadows layer correctly ──
    // Shadow angle: most point one way (toward suns offset), but anomaly
    // "Split Shadows" makes them diverge.
    const baseShadowAng = (0.0) + (r() - 0.5) * 0.3; // near-horizontal
    const sceneN = p.density;
    const monos = [];
    for (let i = 0; i < sceneN; i++) {
      // distribute across width in jittered bands so nothing clusters, depth
      // from horizon downward (nearer = lower on the canvas)
      const depth = i === sceneN - 1 ? 0.85 + r() * 0.1 : (0.15 + (i / sceneN) * 0.6 + (r() - 0.5) * 0.18);
      const band = (i + 0.5) / sceneN;
      const gx = W * K.clamp(band + (r() - 0.5) * (1 / sceneN) * 1.3, 0.04, 0.96);
      const gy = horizon + Math.pow(K.clamp(depth, 0.05, 1), 1.2) * (H - horizon) * 0.62;
      monos.push({ gx, gy, depth: K.clamp(depth, 0.08, 0.97), kind: r() < 0.5 ? 'monolith' : 'antenna', r1: r(), r2: r(), r3: r() });
    }
    monos.sort((a, b) => a.depth - b.depth); // far first

    // draw far hazy duplicates near horizon for teeming density
    {
      x.save();
      for (let i = 0; i < K.rint(r, 8, 16); i++) {
        const hx = r() * W;
        const hy = horizon + r() * (H - horizon) * 0.08;
        const hh = (10 + r() * 30);
        x.strokeStyle = K.rgba(K.mix(P.shadow, P.haze, 0.7), 0.25 + r() * 0.2);
        x.lineWidth = 0.6 + r() * 0.8;
        x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + (r() - 0.5) * 4, hy - hh); x.stroke();
      }
      x.restore();
    }

    // pass 1: all shadows (so monuments sit on top of every shadow)
    for (const m of monos) {
      const h = (m.kind === 'monolith' ? 60 + m.r1 * 130 : 80 + m.r1 * 200) * (0.4 + m.depth * 1.1);
      let ang = baseShadowAng;
      if (p.anom === 'Split Shadows') ang = baseShadowAng + (m.r2 - 0.5) * 1.6;
      // shadow length grows with sun-lowness & monument height — "impossibly long"
      const len = h * (2.2 + m.r3 * 2.5) * (0.6 + m.depth * 0.8);
      const w0 = (m.kind === 'monolith' ? 10 + m.r2 * 24 : 4) * (0.4 + m.depth);
      longShadow(x, P, m.gx, m.gy, len, ang, w0, w0 * 0.3, 0.5, m.depth);
    }

    // pass 2: the monuments themselves
    let scaleFig = null;
    for (let idx = 0; idx < monos.length; idx++) {
      const m = monos[idx];
      const h = (m.kind === 'monolith' ? 60 + m.r1 * 130 : 80 + m.r1 * 200) * (0.4 + m.depth * 1.1);
      if (m.kind === 'monolith') {
        const w = (16 + m.r2 * 40) * (0.4 + m.depth);
        const tilt = (m.r3 - 0.5) * 0.18;
        // anomaly: one monolith floats a few inches off the ground
        let by = m.gy;
        if (p.anom === 'Floating Monolith' && idx === monos.length - 1) {
          by = m.gy - h * 0.06; // hovering — its shadow stays below
        }
        monolith(x, P, m.gx, by, h, w, tilt, m.depth, r);
      } else {
        antenna(x, P, m.gx, m.gy, h, m.depth, r, P.accent);
      }
      // remember a near monument for placing the figure beside it
      if (m.depth > 0.6 && !scaleFig) scaleFig = m;
    }

    // ── LONE FIGURE-SCALE ELEMENT: a tiny dark standing figure for scale ──
    {
      const fm = scaleFig || monos[monos.length - 1];
      const fx = fm.gx + (fm.r1 < 0.5 ? -1 : 1) * (24 + fm.r2 * 40);
      const fy = fm.gy;
      const fh = 14 + fm.depth * 16;
      // its long shadow
      longShadow(x, P, fx, fy, fh * 3.5, baseShadowAng, 2.5, 0.8, 0.45, 0.9);
      // body silhouette
      x.fillStyle = K.rgba(P.shadow, 0.92);
      const fw = fh * 0.22;
      x.beginPath();
      x.ellipse(fx, fy - fh * 0.78, fw * 1.3, fh * 0.24, 0, 0, 7); // head+torso lump
      x.fill();
      x.fillRect(fx - fw * 0.5, fy - fh * 0.62, fw, fh * 0.62); // legs/body
      x.beginPath(); x.arc(fx, fy - fh * 0.88, fw * 0.7, 0, 7); x.fill(); // head
    }

    // ── MIRROR HORIZON anomaly: a faint flipped echo of the monuments above ──
    if (p.anom === 'Mirror Horizon') {
      x.save();
      x.globalAlpha = 0.16;
      x.globalCompositeOperation = 'multiply';
      x.translate(0, horizon * 2);
      x.scale(1, -1);
      for (const m of monos) {
        if (m.depth > 0.5) continue;
        const h = (m.kind === 'monolith' ? 60 + m.r1 * 130 : 80 + m.r1 * 200) * (0.4 + m.depth * 1.1);
        x.fillStyle = K.rgba(P.shadow, 0.5);
        x.fillRect(m.gx - 4, m.gy - h, 8, h);
      }
      x.restore();
    }

    // ── DUST HAZE over the lower scene + low drifting haze band ──
    K.hazeSheet(x, W, H, noise, P.haze, 0.08, 320, 'screen');
    // a low warm dust drift hugging the ground near the horizon
    {
      x.save(); x.globalCompositeOperation = 'screen';
      const dg = x.createLinearGradient(0, horizon - H * 0.04, 0, horizon + H * 0.12);
      dg.addColorStop(0, K.rgba(P.haze, 0));
      dg.addColorStop(0.4, K.rgba(P.haze, 0.3));
      dg.addColorStop(1, K.rgba(P.haze, 0));
      x.fillStyle = dg; x.fillRect(0, horizon - H * 0.04, W, H * 0.16);
      x.restore();
    }

    // ── FINISH: restrained sun-blown bloom, grain, vignette for contrast ──
    K.bloom(x, sun1x, sunY, W * 0.34, P.sun, 0.05);
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, 0.42);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'playa', draw, traits };
})();
