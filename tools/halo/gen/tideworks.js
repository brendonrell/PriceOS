/* TIDEWORKS — a half-flooded oil refinery at dusk, seen six different ways.
 * The tide has risen into a vast petrochemical plant. Towers, pipes, spheres
 * and flare-stacks stand against a bruised dusk and, where there is water, in a
 * still rippled mirror. Surreal industrial-sublime: reflections sharper than the
 * real thing, a flare that burns UNDERWATER, smog you can taste.
 *
 * LAYOUT AXIS (picked by seed) — six STRUCTURALLY DIFFERENT pictures:
 *   Tideline   — wide refinery skyline + full mirror reflection (the classic).
 *   Monolith   — a single hero cooling-tower close-up, plant tiny behind.
 *   Pipeworks  — a maze of pipe racks filling the whole frame, no horizon.
 *   Floodplain — the plant far & tiny across a vast empty flood (big water).
 *   Tankfarm   — high angle looking down across the tank-tops (rows of lids).
 *   Flarestack — a flare-stack hero up close, the plant receding into smog.
 *
 * PALETTE: PETROL DUSK — petrol cyan structures, rust-orange flares,
 * bruised-violet sky, near-black water. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways, all PETROL DUSK family. sky2/sky1 = violet→cyan dusk gradient;
  // water = near-black flood; struct = cyan structure silhouette; flare = rust
  // orange burn; haze = volumetric wash tint; spark = hottest highlight.
  const PALS = [
    { name: 'Petrol Dusk',   sky1:'#3a1f5c', sky2:'#143b52', water:'#040a10', struct:'#1ec8c8', flare:'#ff6a2a', haze:'#2a6e7a', spark:'#ffd2a0' },
    { name: 'Bruised Violet',sky1:'#2a1148', sky2:'#1d2f5a', water:'#05070f', struct:'#26b4c8', flare:'#ff5e1e', haze:'#3a4e88', spark:'#ffc890' },
    { name: 'Rust Tide',     sky1:'#4a1d44', sky2:'#3a2a3e', water:'#0a0608', struct:'#28cfc0', flare:'#ff7a2c', haze:'#7a4a4a', spark:'#ffd8b0' },
    { name: 'Cyan Flood',    sky1:'#241a52', sky2:'#0e4a5a', water:'#030c12', struct:'#18d8d2', flare:'#ff6422', haze:'#1e7e8a', spark:'#d6fbff' },
    { name: 'Deep Petrol',   sky1:'#181436', sky2:'#0a2c3e', water:'#02060a', struct:'#1ab0b8', flare:'#ff5818', haze:'#1a5a68', spark:'#ffcaa0' },
    { name: 'Ember Dusk',    sky1:'#3e1638', sky2:'#522a1e', water:'#080606', struct:'#22c2b6', flare:'#ff8434', haze:'#8a4e36', spark:'#ffe2bc' },
  ];

  const HOURS = ['Last Light', 'Blue Hour', 'Smog Dusk', 'First Dark'];
  const TIDES = ['Slack Water', 'Glass Mirror', 'Rippled', 'Misted'];

  // ── LAYOUTS — each declares its own format so the framing differs too.
  const LAYOUTS = [
    { name: 'Tideline',   W: 1480, H: 1120 }, // wide split, full reflection
    { name: 'Monolith',   W: 1180, H: 1240 }, // tall, hero close-up
    { name: 'Pipeworks',  W: 1240, H: 1240 }, // square maze, no horizon
    { name: 'Floodplain', W: 1480, H: 1040 }, // very wide, vast flood
    { name: 'Tankfarm',   W: 1320, H: 1180 }, // high-angle plan
    { name: 'Flarestack', W: 1180, H: 1280 }, // tall, flame hero
  ];

  // layout is chosen from a SEPARATE deterministic stream (offset-tuned) so it
  // doesn't perturb the rest of the param stream and the 8 preview seeds spread
  // across all six compositions instead of clumping on one.
  function pickLayout(seed) {
    const lr = K.rng(seed);
    for (let k = 0; k < 10; k++) lr();
    return LAYOUTS[Math.floor(lr() * LAYOUTS.length)];
  }

  function params(r, seed) {
    const layout = pickLayout(seed);
    return {
      layout,
      pal: K.pick(PALS, r),
      hour: K.pick(HOURS, r),
      tide: K.pick(TIDES, r),
      units: K.rint(r, 7, 12),
      focal: 0.22 + r() * 0.56,
      underwaterFlare: r() < 0.6,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed), seed);
    return { Layout: p.layout.name, Palette: p.pal.name, Hour: p.hour, Tide: p.tide, Stacks: p.units };
  }

  // ── A single refinery "unit" silhouette built at base x, ground y, with a
  // depth d (0 far/hazy/small .. 1 near/dark/big). We draw into a chosen color
  // & alpha. lightX = world x of the dusk light source (shared lighting dir).
  function drawUnit(x, type, bx, groundY, h, w, col, alpha, r, spark, lightX) {
    x.save();
    x.lineCap = 'round'; x.lineJoin = 'round';
    spark = spark || '#ffffff';
    const lx = lightX == null ? bx - w : lightX;
    const lit = K.mix(col, spark, 0.40);
    const shade = K.mix(col, '#000', 0.55);
    function cylGrad(x0, x1) {
      const fromLeft = lx < bx;
      const g = x.createLinearGradient(fromLeft ? x0 : x1, 0, fromLeft ? x1 : x0, 0);
      g.addColorStop(0, K.rgba(shade, alpha));
      g.addColorStop(0.30, K.rgba(lit, alpha));
      g.addColorStop(0.55, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(shade, alpha));
      return g;
    }
    if (type === 'tower') {
      const tw = w;
      x.fillStyle = cylGrad(bx - tw / 2, bx + tw / 2);
      x.beginPath();
      x.moveTo(bx - tw / 2, groundY);
      x.lineTo(bx - tw * 0.42, groundY - h);
      x.lineTo(bx + tw * 0.42, groundY - h);
      x.lineTo(bx + tw / 2, groundY);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(lit, alpha);
      x.beginPath(); x.ellipse(bx, groundY - h, tw * 0.42, tw * 0.16, 0, 0, 7); x.fill();
      x.strokeStyle = K.rgba(shade, alpha * 0.8);
      x.lineWidth = Math.max(0.6, w * 0.05);
      const rings = 4 + Math.floor(r() * 5);
      for (let i = 1; i < rings; i++) {
        const ry = groundY - h * (i / rings);
        x.beginPath(); x.moveTo(bx - tw * 0.45, ry); x.lineTo(bx + tw * 0.45, ry); x.stroke();
      }
    } else if (type === 'sphere') {
      const rad = w * 0.5;
      const cy = groundY - rad - h * 0.12;
      const hxx = bx + (lx < bx ? -1 : 1) * rad * 0.4, hyy = cy - rad * 0.35;
      const g = x.createRadialGradient(hxx, hyy, rad * 0.05, bx, cy, rad * 1.15);
      g.addColorStop(0, K.rgba(lit, alpha));
      g.addColorStop(0.5, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(shade, alpha));
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, cy, rad, 0, 7); x.fill();
      x.strokeStyle = K.rgba(shade, alpha * 0.5); x.lineWidth = Math.max(0.5, w * 0.02);
      x.beginPath(); x.ellipse(bx, cy, rad, rad * 0.18, 0, 0, 7); x.stroke();
      x.strokeStyle = K.rgba(col, alpha);
      x.lineWidth = Math.max(0.8, w * 0.06);
      for (const s of [-0.6, -0.2, 0.2, 0.6]) {
        x.beginPath(); x.moveTo(bx + s * rad, cy + rad * 0.7); x.lineTo(bx + s * rad * 1.3, groundY); x.stroke();
      }
    } else if (type === 'tank') {
      x.fillStyle = cylGrad(bx - w / 2, bx + w / 2);
      x.fillRect(bx - w / 2, groundY - h, w, h);
      x.fillStyle = K.rgba(lit, alpha);
      x.beginPath(); x.ellipse(bx, groundY - h, w * 0.5, w * 0.12, 0, 0, 7); x.fill();
      x.strokeStyle = K.rgba(shade, alpha * 0.6); x.lineWidth = Math.max(0.5, w * 0.03);
      for (let i = 1; i < 3; i++) { const ry = groundY - h * (i / 3); x.beginPath(); x.moveTo(bx - w / 2, ry); x.lineTo(bx + w / 2, ry); x.stroke(); }
    } else if (type === 'stack') {
      const sw = w * 0.34;
      const sg = x.createLinearGradient(bx - sw / 2, 0, bx + sw / 2, 0);
      sg.addColorStop(0, K.rgba(shade, alpha));
      sg.addColorStop(0.5, K.rgba(col, alpha));
      sg.addColorStop(1, K.rgba(shade, alpha));
      x.fillStyle = sg;
      x.beginPath();
      x.moveTo(bx - sw / 2, groundY);
      x.lineTo(bx - sw * 0.32, groundY - h);
      x.lineTo(bx + sw * 0.32, groundY - h);
      x.lineTo(bx + sw / 2, groundY);
      x.closePath(); x.fill();
    } else if (type === 'cooling') {
      x.fillStyle = cylGrad(bx - w / 2, bx + w / 2);
      x.beginPath();
      x.moveTo(bx - w / 2, groundY);
      x.quadraticCurveTo(bx - w * 0.18, groundY - h * 0.6, bx - w * 0.30, groundY - h);
      x.lineTo(bx + w * 0.30, groundY - h);
      x.quadraticCurveTo(bx + w * 0.18, groundY - h * 0.6, bx + w / 2, groundY);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(lit, alpha * 0.8);
      x.beginPath(); x.ellipse(bx, groundY - h, w * 0.30, w * 0.07, 0, 0, 7); x.fill();
    }
    x.restore();
  }

  // pipe rack: a horizontal banded structure connecting units along the ground
  function drawPipeRack(x, x0, x1, groundY, h, col, alpha) {
    x.save();
    x.strokeStyle = K.rgba(col, alpha);
    x.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const py = groundY - h + i * h * 0.18;
      x.lineWidth = Math.max(0.6, h * 0.06);
      x.beginPath(); x.moveTo(x0, py); x.lineTo(x1, py); x.stroke();
    }
    const n = Math.max(2, Math.floor((x1 - x0) / (h * 0.9)));
    x.lineWidth = Math.max(0.8, h * 0.08);
    for (let i = 0; i <= n; i++) {
      const lx = x0 + (x1 - x0) * (i / n);
      x.beginPath(); x.moveTo(lx, groundY - h); x.lineTo(lx, groundY); x.stroke();
    }
    x.restore();
  }

  // ── A refinery flare: teardrop flame, fat at base, flickering tip. SHORT.
  function drawFlare(x, noise, seed, P, fx, fy, scale, col, intensity, flip, flick) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const dir = flip ? 1 : -1;
    const flH = scale * (0.85 + 0.5 * Math.abs(Math.sin(flick || 0)));
    const flW = scale * 0.62;
    const ph = flick || 0;
    function flamePath(wScale, hScale, lean) {
      x.beginPath();
      const segs = 10;
      const tipLean = Math.sin(ph * 1.7) * flW * 0.5 * lean;
      for (let i = 0; i <= segs; i++) {
        const tt = i / segs;
        const ny = fy + dir * flH * hScale * tt;
        const prof = Math.sin(Math.pow(tt, 0.7) * Math.PI) * (1 - tt * 0.25);
        const wob = noise.fbm(tt * 5 + ph, seed * 0.02, 3) * flW * 0.18;
        const cx = fx + tipLean * tt * tt + wob;
        x.lineTo(cx - prof * flW * wScale, ny);
      }
      for (let i = segs; i >= 0; i--) {
        const tt = i / segs;
        const ny = fy + dir * flH * hScale * tt;
        const prof = Math.sin(Math.pow(tt, 0.7) * Math.PI) * (1 - tt * 0.25);
        const wob = noise.fbm(tt * 5 + ph + 50, seed * 0.02, 3) * flW * 0.18;
        const cx = fx + tipLean * tt * tt + wob;
        x.lineTo(cx + prof * flW * wScale, ny);
      }
      x.closePath();
    }
    const fg = x.createLinearGradient(fx, fy, fx, fy + dir * flH);
    fg.addColorStop(0, K.rgba(col, 0.85 * intensity));
    fg.addColorStop(0.45, K.rgba(col, 0.55 * intensity));
    fg.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = fg; flamePath(1, 1, 1); x.fill();
    const cg = x.createLinearGradient(fx, fy, fx, fy + dir * flH * 0.7);
    cg.addColorStop(0, K.rgba(P.spark, 0.9 * intensity));
    cg.addColorStop(1, K.rgba(P.spark, 0));
    x.fillStyle = cg; flamePath(0.5, 0.72, 0.8); x.fill();
    K.bloom(x, fx, fy, scale * 1.6, col, 0.55 * intensity);
    K.bloom(x, fx, fy + dir * flH * 0.2, scale * 0.7, P.spark, 0.7 * intensity);
    x.globalCompositeOperation = 'screen';
    const smokeN = flip ? 2 : 5;
    for (let s = 1; s <= smokeN; s++) {
      const sy = fy + dir * flH * (1.0 + s * 0.55);
      const sx = fx + noise.fbm(s * 2 + ph, seed * 0.03, 2) * scale * (1.2 + s * 0.4) + s * scale * 0.15 * Math.sin(ph);
      K.bloom(x, sx, sy, scale * (1.0 + s * 0.7), K.mix(P.haze, P.sky1, 0.5), 0.07);
    }
    x.restore();
  }

  // ── SHARED ATMOSPHERE ──────────────────────────────────────────────────────

  // Dusk sky into a band [0..bottomY]. zenithDark scales how black the top is.
  function paintSky(x, P, W, bottomY, env) {
    const sg = x.createLinearGradient(0, 0, 0, bottomY);
    sg.addColorStop(0, K.mix(P.sky1, '#000', env.night ? 0.4 : 0.12));
    sg.addColorStop(0.5, K.mix(P.sky1, P.sky2, 0.55));
    sg.addColorStop(0.85, K.mix(P.sky2, P.haze, 0.4));
    sg.addColorStop(1, K.mix(P.sky2, P.flare, env.smog ? 0.22 : 0.10));
    x.fillStyle = sg; x.fillRect(0, 0, W, bottomY);
    // dusk glow band on the horizon (sun just set behind the plant)
    x.save();
    x.globalCompositeOperation = 'lighter';
    const glowX = env.glowX;
    const gh = x.createRadialGradient(glowX, bottomY, 0, glowX, bottomY, W * 0.55);
    gh.addColorStop(0, K.rgba(K.mix(P.flare, P.spark, 0.4), (env.smog ? 0.22 : 0.14) * env.skyBright));
    gh.addColorStop(0.4, K.rgba(P.haze, 0.09 * env.skyBright));
    gh.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = gh; x.fillRect(0, 0, W, bottomY);
    x.restore();
  }

  function paintWater(x, P, W, H, horizonY) {
    const wg = x.createLinearGradient(0, horizonY, 0, H);
    wg.addColorStop(0, K.mix(P.water, P.sky2, 0.30));
    wg.addColorStop(0.25, K.mix(P.water, P.haze, 0.10));
    wg.addColorStop(1, K.mix(P.water, '#000', 0.3));
    x.fillStyle = wg; x.fillRect(0, horizonY, W, H - horizonY);
  }

  // far atmospheric haze-banks + a dense micro-skyline along a horizon line
  function farPlant(x, P, W, H, horizonY, r, density) {
    x.save();
    const farCol = K.mix(P.haze, P.sky2, 0.5);
    for (let i = 0; i < 5; i++) {
      const fh = horizonY * (0.06 + r() * 0.08);
      x.fillStyle = K.rgba(farCol, 0.10 + r() * 0.06);
      x.beginPath(); x.moveTo(0, horizonY);
      let cx = 0;
      while (cx < W) {
        const step = W * (0.03 + r() * 0.05);
        const ty = horizonY - fh * (0.3 + r() * 0.9);
        x.lineTo(cx, ty); x.lineTo(cx + step, ty);
        cx += step;
      }
      x.lineTo(W, horizonY); x.closePath(); x.fill();
    }
    x.restore();
    x.save();
    const microN = Math.floor((22 + r() * 16) * density);
    for (let i = 0; i < microN; i++) {
      const mx = r() * W;
      const mh = horizonY * (0.04 + r() * 0.10);
      const mw = mh * (0.12 + r() * 0.22);
      const mc = K.mix(P.haze, P.struct, 0.25 + r() * 0.2);
      x.fillStyle = K.rgba(mc, 0.10 + r() * 0.10);
      x.fillRect(mx - mw / 2, horizonY - mh, mw, mh);
      if (r() < 0.3) x.fillRect(mx - mw * 0.08, horizonY - mh * 1.6, mw * 0.16, mh * 0.6);
    }
    x.restore();
  }

  // waterline mist + reflective sheen strip exactly on a horizon
  function waterline(x, P, W, H, horizonY, env, r) {
    x.save();
    x.globalCompositeOperation = 'screen';
    const mg = x.createLinearGradient(0, horizonY - H * 0.06, 0, horizonY + H * 0.05);
    mg.addColorStop(0, K.rgba(P.haze, 0));
    mg.addColorStop(0.5, K.rgba(K.mix(P.haze, P.struct, 0.2), env.misted ? 0.30 : 0.16));
    mg.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = mg; x.fillRect(0, horizonY - H * 0.06, W, H * 0.11);
    for (let i = 0; i < 8; i++) {
      const mx = r() * W;
      K.bloom(x, mx, horizonY + (r() - 0.5) * H * 0.02, H * (0.04 + r() * 0.05),
        K.mix(P.haze, P.struct, 0.3), env.misted ? 0.16 : 0.09);
    }
    x.restore();
    x.save();
    x.globalCompositeOperation = 'lighter';
    const sheenG = x.createLinearGradient(0, horizonY, 0, horizonY + H * 0.04);
    sheenG.addColorStop(0, K.rgba(K.mix(P.struct, P.spark, 0.3), 0.18));
    sheenG.addColorStop(1, K.rgba(P.struct, 0));
    x.fillStyle = sheenG; x.fillRect(0, horizonY, W, H * 0.04);
    x.restore();
  }

  // ripple-displace + darken the mirror region [hy..H]
  function rippleWater(x, noise, seed, P, W, H, hy, rip) {
    hy = Math.round(hy);
    try {
      const img = x.getImageData(0, hy, W, H - hy);
      const out = x.createImageData(W, H - hy);
      const sd = img.data, od = out.data, rows = H - hy;
      for (let row = 0; row < rows; row++) {
        const t = row / rows;
        const amp = (t * t * (3 + t * 26)) * rip;
        const off = Math.round(
          (noise.fbm(row / 9, seed * 0.013, 3) +
           0.4 * noise.fbm(row / 3.5 + 11, seed * 0.02, 2)) * amp);
        for (let cx = 0; cx < W; cx++) {
          let sx = cx + off; if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
          const di = (row * W + cx) * 4, si = (row * W + sx) * 4;
          od[di] = sd[si]; od[di + 1] = sd[si + 1]; od[di + 2] = sd[si + 2]; od[di + 3] = 255;
        }
      }
      x.putImageData(out, 0, hy);
    } catch (e) {}
    x.save();
    x.globalCompositeOperation = 'source-over';
    for (let yy = hy; yy < H; yy += 2) {
      const t = (yy - hy) / (H - hy);
      const wob = noise.fbm(yy / 6, seed * 0.01, 3) * rip;
      const a = (0.05 + t * 0.16) * (0.6 + Math.abs(wob));
      x.fillStyle = K.rgba(K.mix(P.water, '#000', 0.4), a);
      x.fillRect(0, yy, W, 1);
    }
    x.restore();
  }

  // the surreal underwater flare (used by water-bearing layouts)
  function underwaterFlare(x, noise, seed, P, W, H, horizonY, fx, r) {
    const uwy = horizonY + (H - horizonY) * (0.35 + r() * 0.3);
    x.save();
    x.globalCompositeOperation = 'lighter';
    const us = (H - horizonY) * 0.16;
    K.bloom(x, fx, uwy, us * 5, P.flare, 0.22);
    K.bloom(x, fx, uwy, us * 2.4, K.mix(P.flare, P.spark, 0.3), 0.30);
    drawFlare(x, noise, seed, P, fx, uwy, us, P.flare, 1.0, false, seed * 0.7);
    x.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 5; s++) {
      const sxoff = (s - 2) * us * 0.5 + noise.fbm(s * 2, seed * 0.05, 2) * us;
      const grd = x.createLinearGradient(fx + sxoff, uwy, fx + sxoff * 0.4, horizonY);
      grd.addColorStop(0, K.rgba(K.mix(P.flare, P.spark, 0.4), 0.10));
      grd.addColorStop(1, K.rgba(P.struct, 0));
      x.fillStyle = grd;
      x.beginPath();
      x.moveTo(fx + sxoff - us * 0.3, uwy);
      x.lineTo(fx + sxoff + us * 0.3, uwy);
      x.lineTo(fx + sxoff * 0.4 + us * 0.6, horizonY);
      x.lineTo(fx + sxoff * 0.4 - us * 0.6, horizonY);
      x.closePath(); x.fill();
    }
    const ring = x.createRadialGradient(fx, horizonY, 0, fx, horizonY, us * 5);
    ring.addColorStop(0, K.rgba(K.mix(P.flare, P.spark, 0.3), 0.26));
    ring.addColorStop(0.45, K.rgba(P.struct, 0.12));
    ring.addColorStop(1, K.rgba(P.struct, 0));
    x.fillStyle = ring; x.fillRect(fx - us * 5, horizonY - us * 1.5, us * 10, us * 6);
    for (let b = 0; b < 22; b++) {
      const bt = r();
      const by = uwy - bt * (uwy - horizonY) * 1.05;
      const bx2 = fx + noise.fbm(b * 3, seed * 0.04, 2) * us * 2.2 + (b % 2 ? 1 : -1) * us * 0.3;
      x.fillStyle = K.rgba(K.mix(P.flare, P.spark, 0.4), 0.10 + (1 - bt) * 0.22);
      x.beginPath(); x.arc(bx2, by, 0.8 + r() * 2.8, 0, 7); x.fill();
    }
    x.restore();
  }

  // the signature finishing wash — applied at the very end of every layout
  function finish(x, P, W, H, noise, env, r, vignetteHi) {
    K.hazeSheet(x, W, H, noise, K.mix(P.sky1, P.struct, 0.4), env.smog ? 0.16 : 0.12, 340, 'screen');
    K.hazeSheet(x, W, H, noise, P.haze, 0.08, 180, 'screen');
    // sky dust / star grain in the upper sky
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 120; i++) {
      const sx = r() * W, sy = r() * H * 0.55;
      x.fillStyle = K.rgba(K.mix(P.struct, P.spark, r()), 0.04 + r() * 0.16);
      x.fillRect(sx, sy, r() < 0.1 ? 1.4 : 0.8, 0.8);
    }
    x.restore();
    if (!env.night) K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 460, r);
    K.vignette(x, W, H, vignetteHi == null ? 0.55 : vignetteHi);
  }

  // build a skyline of units biased into a cluster (shared by Tideline)
  function buildSkyline(p, r, W, horizonY) {
    const units = [];
    const N = p.units;
    const clusterX = p.focal;
    const spread = 0.6 + r() * 0.5;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1 || 1);
      let bxN = clusterX + (t - 0.5) * spread + K.randn(r) * 0.10;
      bxN = K.clamp(bxN, 0.02, 0.98);
      const nearCluster = 1 - Math.min(1, Math.abs(bxN - clusterX) * 2.2);
      const depth = K.clamp(0.14 + nearCluster * 0.5 + r() * 0.4, 0.1, 1);
      const types = ['tower', 'sphere', 'tank', 'stack', 'cooling', 'tower', 'stack', 'tank'];
      const type = K.pick(types, r);
      const baseH = type === 'stack' ? 0.24 : type === 'tower' ? 0.22 : type === 'cooling' ? 0.20 : 0.12;
      const h = horizonY * (baseH + depth * 0.36) * (0.65 + r() * 0.65);
      const w = h * (type === 'sphere' ? 0.85 : type === 'tank' ? 0.9 : type === 'cooling' ? 0.7 : 0.28) * (0.8 + r() * 0.4);
      const useed = Math.floor(bxN * 9973 + h * 31 + i * 7) >>> 0;
      const hasFlame = type === 'stack' || (type === 'tower' && r() < 0.18);
      units.push({ type, bx: bxN * W, h, w, depth, hasFlame, useed,
        flameStr: 0.6 + r() * 0.8, flick: r() * 6.28 });
    }
    units.sort((a, b) => a.depth - b.depth);
    const racks = [];
    const nr = K.rint(r, 2, 4);
    for (let i = 0; i < nr; i++) {
      const rx0 = r() * W * 0.7;
      const rw = W * (0.14 + r() * 0.30);
      racks.push({ x0: rx0, x1: rx0 + rw, h: horizonY * (0.04 + r() * 0.05) });
    }
    return { units, racks };
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT 1 — TIDELINE: wide skyline + full mirror reflection (the classic)
  // ════════════════════════════════════════════════════════════════════════
  function layoutTideline(x, p, P, W, H, seed, r, noise, env) {
    const horizonY = H * (0.46 + (r() - 0.5) * 0.10);
    paintSky(x, P, W, horizonY, env);
    paintWater(x, P, W, H, horizonY);
    const sky = buildSkyline(p, r, W, horizonY);
    const units = sky.units, racks = sky.racks;
    farPlant(x, P, W, H, horizonY, r, 1.0);

    function paintSkyline(reflection) {
      const flameAnchors = [];
      for (const u of units) {
        const d = u.depth;
        const realCol = K.mix(K.mix(P.struct, P.haze, (1 - d) * 0.85), '#000', 0.10 + d * 0.30);
        const col = reflection ? K.mix(P.struct, P.spark, 0.12 + (1 - d) * 0.1) : realCol;
        const alpha = reflection ? (0.45 + d * 0.40) : (0.5 + d * 0.50);
        if (!reflection && d > 0.45) {
          drawUnit(x, u.type, u.bx, horizonY, u.h, u.w, K.mix(P.struct, '#000', 0.7), 0.55 + d * 0.35, K.rng(u.useed), P.spark, env.glowX);
        }
        drawUnit(x, u.type, u.bx, horizonY, u.h, u.w, col, alpha, K.rng(u.useed), reflection ? P.spark : P.struct, env.glowX);
        if (!reflection && d > 0.5) {
          K.mottle(x, u.bx - u.w * 0.6, horizonY - u.h, u.w * 1.2, u.h, col, 70, K.rng(u.useed + 3), 'overlay');
        }
        if (u.hasFlame) flameAnchors.push({ bx: u.bx, ty: horizonY - u.h, depth: d, str: u.flameStr, flick: u.flick });
      }
      const rackCol = reflection ? K.mix(P.struct, P.spark, 0.12) : K.mix(P.struct, '#000', 0.3);
      for (const rk of racks) drawPipeRack(x, rk.x0, rk.x1, horizonY, rk.h, rackCol, reflection ? 0.4 : 0.5);
      return flameAnchors;
    }

    // reflection first, flipped + rippled
    x.save();
    x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
    x.translate(0, horizonY); x.scale(1, -1); x.translate(0, -horizonY);
    const reflFlames = paintSkyline(true);
    x.restore();
    const rip = env.rip;
    rippleWater(x, noise, seed, P, W, H, horizonY, rip);

    // mid veil
    x.save();
    x.globalCompositeOperation = 'screen';
    const veilY = horizonY - H * 0.10;
    const vg = x.createLinearGradient(0, veilY, 0, horizonY + H * 0.01);
    vg.addColorStop(0, K.rgba(P.haze, 0));
    vg.addColorStop(0.7, K.rgba(K.mix(P.haze, P.sky2, 0.3), env.smog ? 0.22 : 0.14));
    vg.addColorStop(1, K.rgba(P.haze, 0.04));
    x.fillStyle = vg; x.fillRect(0, veilY, W, horizonY - veilY + H * 0.01);
    x.restore();

    const realFlames = paintSkyline(false);
    for (const f of realFlames) {
      const scale = horizonY * (0.035 + f.depth * 0.05) * f.str;
      drawFlare(x, noise, seed, P, f.bx, f.ty, scale, P.flare, 0.55 + f.depth * 0.45, false, f.flick);
    }
    x.save();
    x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
    for (const f of reflFlames) {
      const ry = horizonY + (horizonY - f.ty);
      const scale = horizonY * (0.035 + f.depth * 0.05) * f.str;
      drawFlare(x, noise, seed, P, f.bx, ry, scale, K.mix(P.flare, P.spark, 0.3), 0.6 + f.depth * 0.4, true, f.flick + 1.3);
    }
    x.restore();

    if (p.underwaterFlare) underwaterFlare(x, noise, seed, P, W, H, horizonY, K.clamp(p.focal + (r() - 0.5) * 0.3, 0.15, 0.85) * W, r);
    waterline(x, P, W, H, horizonY, env, r);
    finish(x, P, W, H, noise, env, r, 0.55);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT 2 — MONOLITH: a single hero cooling-tower close-up, plant tiny behind
  // ════════════════════════════════════════════════════════════════════════
  function layoutMonolith(x, p, P, W, H, seed, r, noise, env) {
    const horizonY = H * 0.72; // low horizon, tower looms over it
    paintSky(x, P, W, horizonY, env);
    paintWater(x, P, W, H, horizonY);
    farPlant(x, P, W, H, horizonY, r, 0.8);

    // hero cooling tower — huge, off-centre, base in the water
    const cx = W * (0.34 + r() * 0.20);
    const baseY = horizonY + (H - horizonY) * 0.18;
    const topY = H * (0.06 + r() * 0.05);
    const towerH = baseY - topY;
    const waistW = W * (0.30 + r() * 0.06);
    const topW = waistW * 0.78;
    const botW = waistW * 1.18;
    // hyperboloid silhouette
    function towerProfile(t) { // t 0=base .. 1=top
      const waist = 0.42;
      const k = Math.abs(t - waist) / Math.max(waist, 1 - waist);
      const wmin = waistW * 0.5;
      const wide = (t < waist ? botW : topW) * 0.5;
      return wmin + (wide - wmin) * (k * k);
    }
    // dark solid underlay
    x.save();
    function fillTower(col, a) {
      x.fillStyle = K.rgba(col, a);
      x.beginPath();
      const segs = 40;
      for (let i = 0; i <= segs; i++) { const t = i / segs; const y = baseY - towerH * t; x.lineTo(cx - towerProfile(t), y); }
      for (let i = segs; i >= 0; i--) { const t = i / segs; const y = baseY - towerH * t; x.lineTo(cx + towerProfile(t), y); }
      x.closePath(); x.fill();
    }
    fillTower(K.mix(P.struct, '#000', 0.78), 0.97);
    // tower path used for clipping the body shading passes
    const segs = 40;
    function towerPath() {
      x.beginPath();
      for (let i = 0; i <= segs; i++) { const t = i / segs; const y = baseY - towerH * t; x.lineTo(cx - towerProfile(t), y); }
      for (let i = segs; i >= 0; i--) { const t = i / segs; const y = baseY - towerH * t; x.lineTo(cx + towerProfile(t), y); }
      x.closePath();
    }
    // body gradient (lit from glow side) — deep & saturated, not glassy
    const fromLeft = env.glowX < cx;
    const bg = x.createLinearGradient(cx - botW / 2, 0, cx + botW / 2, 0);
    const lit = K.mix(P.struct, P.spark, 0.30), shade = K.mix(P.struct, '#000', 0.7), mid = K.mix(P.struct, '#000', 0.45);
    bg.addColorStop(0, K.rgba(fromLeft ? mid : shade, 0.92));
    bg.addColorStop(0.34, K.rgba(fromLeft ? lit : mid, 0.92));
    bg.addColorStop(0.62, K.rgba(mid, 0.92));
    bg.addColorStop(1, K.rgba(fromLeft ? shade : mid, 0.92));
    x.save();
    towerPath(); x.clip();
    x.fillStyle = bg; x.fillRect(cx - botW, topY, botW * 2, towerH);
    // VERTICAL atmospheric depth — base sinks into dusk haze, crown catches light
    const vg = x.createLinearGradient(0, topY, 0, baseY);
    vg.addColorStop(0, K.rgba(K.mix(P.haze, P.spark, 0.3), 0.22));      // lit crown
    vg.addColorStop(0.45, K.rgba(P.haze, 0));
    vg.addColorStop(1, K.rgba(K.mix(P.haze, P.sky2, 0.5), 0.5));        // hazy base
    x.globalCompositeOperation = 'screen';
    x.fillStyle = vg; x.fillRect(cx - botW, topY, botW * 2, towerH);
    x.restore();
    // ribbed concrete bands
    x.strokeStyle = K.rgba(shade, 0.5); x.lineCap = 'round';
    const rings = 22;
    for (let i = 1; i < rings; i++) {
      const t = i / rings; const y = baseY - towerH * t; const pw = towerProfile(t);
      x.lineWidth = Math.max(0.8, towerH * 0.004);
      x.beginPath(); x.ellipse(cx, y, pw, pw * 0.10, 0, 0, 7); x.stroke();
    }
    // vertical fluting
    x.strokeStyle = K.rgba(K.mix(P.struct, '#000', 0.4), 0.3);
    for (let i = -5; i <= 5; i++) {
      x.lineWidth = Math.max(0.6, towerH * 0.003);
      x.beginPath();
      for (let s = 0; s <= segs; s++) { const t = s / segs; const y = baseY - towerH * t; x.lineTo(cx + (i / 6) * towerProfile(t), y); }
      x.stroke();
    }
    // rim lip at the top
    x.fillStyle = K.rgba(lit, 0.8);
    x.beginPath(); x.ellipse(cx, topY, towerProfile(1), towerProfile(1) * 0.12, 0, 0, 7); x.fill();
    x.fillStyle = K.rgba(K.mix(P.water, '#000', 0.3), 0.85);
    x.beginPath(); x.ellipse(cx, topY, towerProfile(1) * 0.86, towerProfile(1) * 0.10, 0, 0, 7); x.fill();
    K.mottle(x, cx - botW / 2, topY, botW, towerH, K.mix(P.struct, '#000', 0.3), 90, r, 'overlay');
    // billowing steam from the mouth
    x.globalCompositeOperation = 'screen';
    for (let s = 0; s < 7; s++) {
      const sx = cx + (r() - 0.5) * waistW * 0.6;
      const sy = topY - towerH * (0.04 + s * 0.06);
      K.bloom(x, sx, sy, towerH * (0.10 + s * 0.04), K.mix(P.haze, P.spark, 0.25), 0.10);
    }
    x.restore();

    // a couple of smaller support units flanking, mid-depth, in the water
    for (let i = 0; i < 3; i++) {
      const sbx = (i < 1 ? 0.08 + r() * 0.12 : 0.78 + r() * 0.16) * W;
      const types = ['tower', 'stack', 'tank', 'sphere'];
      const ty = K.pick(types, r);
      const sh = horizonY * (0.20 + r() * 0.18);
      const sw = sh * (ty === 'sphere' ? 0.8 : ty === 'tank' ? 0.9 : 0.3);
      drawUnit(x, ty, sbx, horizonY, sh, sw, K.mix(P.struct, '#000', 0.45), 0.7, K.rng((sbx * 13) >>> 0), P.struct, env.glowX);
    }

    // a flare on a stack to the side
    const flx = (r() < 0.5 ? 0.82 : 0.14) * W;
    const fh = horizonY * 0.32;
    drawUnit(x, 'stack', flx, horizonY, fh, fh * 0.22, K.mix(P.struct, '#000', 0.5), 0.7, r, P.struct, env.glowX);
    drawFlare(x, noise, seed, P, flx, horizonY - fh, horizonY * 0.05, P.flare, 0.8, false, r() * 6);

    // reflection of the whole lower band (cheap: ripple the water strip we have)
    waterline(x, P, W, H, horizonY, env, r);
    if (p.underwaterFlare) underwaterFlare(x, noise, seed, P, W, H, horizonY, K.clamp(0.2 + r() * 0.6, 0.15, 0.85) * W, r);
    finish(x, P, W, H, noise, env, r, 0.6);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT 3 — PIPEWORKS: a maze of pipe racks filling the whole frame, no horizon
  // ════════════════════════════════════════════════════════════════════════
  function layoutPipeworks(x, p, P, W, H, seed, r, noise, env) {
    // no sky/water — a dense industrial interior, dusk light leaking through.
    const bg = x.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, K.mix(P.sky1, '#000', 0.5));
    bg.addColorStop(0.5, K.mix(P.sky2, '#000', 0.45));
    bg.addColorStop(1, K.mix(P.water, P.haze, 0.18));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // a hot glow source low, leaking between the pipes
    K.bloom(x, env.glowX, H * (0.55 + r() * 0.3), W * 0.5, K.mix(P.flare, P.sky1, 0.5), 0.20);
    K.bloom(x, W * (0.2 + r() * 0.6), H * 0.2, W * 0.4, K.mix(P.haze, P.struct, 0.4), 0.12);

    // vanishing point for the pipe runs → forced perspective
    const vpx = W * (0.30 + r() * 0.40), vpy = H * (0.30 + r() * 0.30);

    // banks of parallel pipes at several depths, marching toward the VP. More
    // banks + steeper angle variance so runs cross and weave → a real maze.
    const banks = K.rint(r, 8, 11);
    const bankData = [];
    for (let b = 0; b < banks; b++) {
      const depth = b / (banks - 1); // 0 far .. 1 near
      bankData.push({ depth, n: K.rint(r, 5, 9), yBase: H * (0.12 + r() * 0.78),
        ang: (r() - 0.5) * 0.9, off: r() * H, seed: (r() * 99991) >>> 0 });
    }
    bankData.sort((a, b) => a.depth - b.depth);

    for (const bk of bankData) {
      const d = bk.depth;
      const col = K.mix(K.mix(P.struct, P.haze, (1 - d) * 0.8), '#000', 0.1 + d * 0.35);
      const alpha = 0.35 + d * 0.5;
      const gauge = (4 + d * 26); // pipe thickness grows with nearness
      x.save();
      x.lineCap = 'round';
      const rr = K.rng(bk.seed);
      // a run of parallel horizontal-ish pipes converging toward VP
      const spread = H * (0.06 + d * 0.16);
      for (let i = 0; i < bk.n; i++) {
        const t = bk.n === 1 ? 0.5 : i / (bk.n - 1);
        const y0 = bk.yBase + (t - 0.5) * spread * 2;
        // far end pulls toward VP, near end at screen edge
        const x0 = -W * 0.1, y_0 = y0;
        const x1 = W * 1.1, y_1 = y0 + (vpy - y0) * 0.0 + bk.ang * (x1 - x0);
        // converge: near pipes spread, far pipes collapse toward VP
        const conv = (1 - d);
        const cv = conv * 0.5;
        const yA = y0 + (vpy - y0) * cv;
        const yB = (y0 + bk.ang * W) + (vpy - (y0 + bk.ang * W)) * cv;
        x.lineWidth = gauge * (0.7 + rr() * 0.6);
        const pcol = K.mix(col, rr() < 0.3 ? P.flare : P.spark, rr() < 0.2 ? 0.25 : 0.0);
        // pipe body
        x.strokeStyle = K.rgba(pcol, alpha);
        x.beginPath(); x.moveTo(-W * 0.1, yA); x.lineTo(W * 1.1, yB); x.stroke();
        // highlight rib along the top of the pipe
        x.strokeStyle = K.rgba(K.mix(pcol, P.spark, 0.5), alpha * 0.5);
        x.lineWidth = gauge * 0.22;
        x.beginPath(); x.moveTo(-W * 0.1, yA - gauge * 0.28); x.lineTo(W * 1.1, yB - gauge * 0.28); x.stroke();
      }
      // vertical support columns / risers crossing the bank
      const cols = K.rint(rr, 3, 6);
      x.strokeStyle = K.rgba(K.mix(col, '#000', 0.3), alpha * 0.9);
      x.lineWidth = gauge * 1.1;
      for (let c = 0; c < cols; c++) {
        const px = (0.05 + c / cols + rr() * 0.1) * W;
        x.beginPath(); x.moveTo(px, bk.yBase - spread * 1.4); x.lineTo(px, bk.yBase + spread * 1.4); x.stroke();
        // elbow joints
        x.fillStyle = K.rgba(K.mix(col, P.spark, 0.2), alpha);
        x.beginPath(); x.arc(px, bk.yBase + (rr() - 0.5) * spread, gauge * 0.7, 0, 7); x.fill();
      }
      // valve wheels on the nearer banks
      if (d > 0.5) {
        for (let v = 0; v < 4; v++) {
          const vx = (0.1 + rr() * 0.8) * W, vy = bk.yBase + (rr() - 0.5) * spread * 1.6;
          x.strokeStyle = K.rgba(K.mix(P.struct, P.spark, 0.3), alpha * 0.8);
          x.lineWidth = gauge * 0.2;
          x.beginPath(); x.arc(vx, vy, gauge * 0.9, 0, 7); x.stroke();
          for (let sp = 0; sp < 6; sp++) { const a = sp / 6 * 6.28; x.beginPath(); x.moveTo(vx, vy); x.lineTo(vx + Math.cos(a) * gauge * 0.9, vy + Math.sin(a) * gauge * 0.9); x.stroke(); }
        }
      }
      x.restore();
    }

    // BIG FOREGROUND RISERS — fat near pipes that climb, bend at an elbow, and
    // run off-frame. These occlude the maze and force the dense, in-amongst-it
    // claustrophobic read instead of a flat field of stripes.
    const risers = K.rint(r, 3, 5);
    for (let s = 0; s < risers; s++) {
      const rx = (0.06 + r() * 0.88) * W;
      const g2 = W * (0.045 + r() * 0.035);
      const elbowY = H * (0.30 + r() * 0.5);
      const dir = r() < 0.5 ? -1 : 1;
      const col = K.mix(K.mix(P.struct, '#000', 0.4), r() < 0.3 ? P.flare : P.struct, r() < 0.3 ? 0.2 : 0);
      x.save();
      x.lineCap = 'round'; x.lineJoin = 'round';
      // shadow
      x.strokeStyle = K.rgba('#000', 0.5); x.lineWidth = g2 * 1.15;
      x.beginPath(); x.moveTo(rx + 6, H + g2); x.lineTo(rx + 6, elbowY); x.lineTo(rx + dir * W * 0.6, elbowY - dir * 0); x.stroke();
      // pipe body
      const pg = x.createLinearGradient(rx - g2, 0, rx + g2, 0);
      pg.addColorStop(0, K.rgba(K.mix(col, '#000', 0.55), 0.95));
      pg.addColorStop(0.38, K.rgba(K.mix(col, P.spark, 0.35), 0.95));
      pg.addColorStop(0.6, K.rgba(col, 0.95));
      pg.addColorStop(1, K.rgba(K.mix(col, '#000', 0.5), 0.95));
      x.strokeStyle = pg; x.lineWidth = g2;
      x.beginPath(); x.moveTo(rx, H + g2); x.lineTo(rx, elbowY); x.lineTo(rx + dir * W * 0.55, elbowY); x.stroke();
      // elbow joint flange
      x.fillStyle = K.rgba(K.mix(col, P.spark, 0.3), 0.95);
      x.beginPath(); x.arc(rx, elbowY, g2 * 0.62, 0, 7); x.fill();
      // bolt collars down the riser
      x.strokeStyle = K.rgba(K.mix(col, '#000', 0.5), 0.8); x.lineWidth = g2 * 0.16;
      for (let c = 0; c < 6; c++) { const cy = elbowY + (H - elbowY) * (c / 6) + g2 * 0.4; x.beginPath(); x.moveTo(rx - g2 * 0.55, cy); x.lineTo(rx + g2 * 0.55, cy); x.stroke(); }
      // a big valve wheel on the near riser
      if (r() < 0.7) {
        const vy = elbowY + (H - elbowY) * (0.2 + r() * 0.4);
        x.strokeStyle = K.rgba(K.mix(P.struct, P.spark, 0.35), 0.85); x.lineWidth = g2 * 0.14;
        x.beginPath(); x.arc(rx + g2 * 0.9, vy, g2 * 0.8, 0, 7); x.stroke();
        for (let sp = 0; sp < 6; sp++) { const a = sp / 6 * 6.28; x.beginPath(); x.moveTo(rx + g2 * 0.9, vy); x.lineTo(rx + g2 * 0.9 + Math.cos(a) * g2 * 0.8, vy + Math.sin(a) * g2 * 0.8); x.stroke(); }
      }
      x.restore();
    }

    // a couple of vertical stacks rising out of the maze with flames
    const stacks = K.rint(r, 1, 3);
    for (let s = 0; s < stacks; s++) {
      const sx = (0.15 + r() * 0.7) * W;
      const sTop = H * (0.08 + r() * 0.18);
      const sBot = H * (0.5 + r() * 0.4);
      const sw = W * (0.02 + r() * 0.02);
      drawUnit(x, 'stack', sx, sBot, sBot - sTop, sw * 3, K.mix(P.struct, '#000', 0.5), 0.85, r, P.struct, env.glowX);
      drawFlare(x, noise, seed, P, sx, sTop, H * (0.035 + r() * 0.03), P.flare, 0.9, false, r() * 6);
    }

    // steam/condensate venting between the pipes
    x.save();
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 10; i++) {
      K.bloom(x, r() * W, r() * H, H * (0.05 + r() * 0.08), K.mix(P.haze, P.struct, 0.4), 0.06 + r() * 0.05);
    }
    x.restore();

    finish(x, P, W, H, noise, env, r, 0.62);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT 4 — FLOODPLAIN: the plant far & tiny across a vast empty flood
  // ════════════════════════════════════════════════════════════════════════
  function layoutFloodplain(x, p, P, W, H, seed, r, noise, env) {
    const horizonY = H * (0.30 + (r() - 0.5) * 0.06); // HIGH horizon → mostly water
    paintSky(x, P, W, horizonY, env);
    paintWater(x, P, W, H, horizonY);
    farPlant(x, P, W, H, horizonY, r, 1.1);

    // the plant: a low, tiny, distant strip clustered near one side
    const cluster = 0.20 + r() * 0.55;
    const N = p.units;
    const flames = [];
    const built = [];
    for (let i = 0; i < N; i++) {
      const bxN = K.clamp(cluster + K.randn(r) * 0.10, 0.04, 0.96);
      const depth = 0.1 + r() * 0.2; // all FAR — tiny scale read
      const types = ['tower', 'stack', 'tank', 'cooling', 'sphere'];
      const ty = K.pick(types, r);
      const h = horizonY * (0.06 + r() * 0.10) * (ty === 'stack' ? 1.6 : 1);
      const w = h * (ty === 'sphere' ? 0.85 : ty === 'tank' ? 0.9 : ty === 'cooling' ? 0.7 : 0.30);
      built.push({ ty, bx: bxN * W, h, w });
      if (ty === 'stack' && r() < 0.7) flames.push({ bx: bxN * W, ty: horizonY - h, str: 0.5 + r() * 0.5, flick: r() * 6 });
    }
    // reflection band (flipped) for the tiny plant
    x.save();
    x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
    x.translate(0, horizonY); x.scale(1, -1); x.translate(0, -horizonY);
    for (const u of built) {
      drawUnit(x, u.ty, u.bx, horizonY, u.h, u.w, K.mix(P.struct, P.spark, 0.18), 0.5, K.rng((u.bx * 7) >>> 0), P.spark, env.glowX);
    }
    x.restore();
    rippleWater(x, noise, seed, P, W, H, horizonY, env.rip * 1.2);

    // real tiny plant
    for (const u of built) {
      const col = K.mix(K.mix(P.struct, P.haze, 0.6), '#000', 0.18);
      drawUnit(x, u.ty, u.bx, horizonY, u.h, u.w, col, 0.62, K.rng((u.bx * 7) >>> 0), P.struct, env.glowX);
    }
    for (const f of flames) {
      drawFlare(x, noise, seed, P, f.bx, f.ty, horizonY * 0.04 * f.str, P.flare, 0.7, false, f.flick);
      // its reflection
      x.save(); x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
      drawFlare(x, noise, seed, P, f.bx, horizonY + (horizonY - f.ty), horizonY * 0.04 * f.str, K.mix(P.flare, P.spark, 0.3), 0.7, true, f.flick + 1.2);
      x.restore();
    }

    // VAST EMPTY WATER — big negative space, just light & ripple. A single
    // long sun-glitter streak down the middle reaching the foreground.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const glitX = env.glowX;
    for (let yy = Math.round(horizonY); yy < H; yy += 3) {
      const t = (yy - horizonY) / (H - horizonY);
      const ww = W * (0.02 + t * 0.16);
      const wob = noise.fbm(yy / 14, seed * 0.02, 3) * W * 0.04 * t;
      const a = (0.16 * (1 - t * 0.7)) * (0.5 + Math.abs(noise.fbm(yy / 3, seed * 0.05, 2)));
      x.fillStyle = K.rgba(K.mix(P.flare, P.spark, 0.5), a * 0.5);
      x.fillRect(glitX - ww / 2 + wob, yy, ww, 2.4);
    }
    x.restore();
    // scattered ripple highlights on the empty flood
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 120; i++) {
      const ry = horizonY + r() * (H - horizonY);
      const t = (ry - horizonY) / (H - horizonY);
      const rx = r() * W;
      const rw = (2 + t * 16) * (0.5 + r());
      x.fillStyle = K.rgba(K.mix(P.struct, P.spark, r() * 0.4), 0.04 + r() * 0.06 * (0.4 + t));
      x.fillRect(rx, ry, rw, 1 + t * 1.5);
    }
    x.restore();

    if (p.underwaterFlare) underwaterFlare(x, noise, seed, P, W, H, horizonY, K.clamp(cluster + (r() - 0.5) * 0.4, 0.15, 0.85) * W, r);
    waterline(x, P, W, H, horizonY, env, r);
    finish(x, P, W, H, noise, env, r, 0.5);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT 5 — TANKFARM: high angle looking down across the tank-tops
  // ════════════════════════════════════════════════════════════════════════
  function layoutTankfarm(x, p, P, W, H, seed, r, noise, env) {
    // overhead-ish plan view: ground plane recedes, rows of circular tank lids.
    // sky only at the very top (a thin band), then a vast flooded tank yard.
    const skyY = H * (0.14 + r() * 0.06);
    paintSky(x, P, W, skyY, env);
    // distant plant on the sky band
    farPlant(x, P, W, H, skyY, r, 0.7);
    // the flooded ground plane (water between the tanks)
    const wg = x.createLinearGradient(0, skyY, 0, H);
    wg.addColorStop(0, K.mix(P.water, P.sky2, 0.35));
    wg.addColorStop(0.3, K.mix(P.water, P.haze, 0.16));
    wg.addColorStop(1, K.mix(P.water, '#000', 0.25));
    x.fillStyle = wg; x.fillRect(0, skyY, W, H - skyY);
    // dusk glow lift right on the far skyline so the horizon doesn't read as a
    // flat dark edge — the sun's afterglow behind the distant plant.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const hg = x.createLinearGradient(0, skyY - H * 0.05, 0, skyY + H * 0.08);
    hg.addColorStop(0, K.rgba(P.haze, 0));
    hg.addColorStop(0.4, K.rgba(K.mix(P.flare, P.haze, 0.5), env.smog ? 0.18 : 0.12));
    hg.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = hg; x.fillRect(0, skyY - H * 0.05, W, H * 0.13);
    x.restore();

    // perspective grid of tank lids: rows recede from bottom (near/big) to
    // skyY (far/tiny). Each tank = an ellipse lid + a short cylinder wall.
    const vpx = W * (0.4 + r() * 0.2);
    const rows = K.rint(r, 6, 9);
    const tanks = [];
    for (let row = 0; row < rows; row++) {
      // t: 0 far .. 1 near ; perspective compresses far rows
      const t = row / (rows - 1);
      const persp = Math.pow(t, 1.6);
      const y = skyY + (H - skyY) * (0.06 + persp * 1.02);
      if (y > H + 40) continue;
      const scale = 0.18 + persp * 1.0;
      const perRow = Math.max(2, Math.round(7 - persp * 4));
      const jitter = (r() - 0.5) * 0.4;
      for (let c = 0; c < perRow; c++) {
        const ct = perRow === 1 ? 0.5 : c / (perRow - 1);
        // columns spread wider as they near (toward edges), converge to vpx far
        const spread = 0.62 + persp * 0.72;
        let bxN = 0.5 + (ct - 0.5) * spread + jitter * (1 - persp) * 0.2;
        const lerpT = 0.25 + persp * 0.75; const bx = vpx + (bxN * W - vpx) * lerpT;
        const rad = W * 0.085 * scale * (0.8 + r() * 0.4);
        tanks.push({ bx, y, rad, scale: persp, seed: (bx * 17 + y * 3) >>> 0,
          flame: r() < 0.10, ty: K.pick(['tank', 'tank', 'tank', 'sphere', 'cooling'], r) });
      }
    }
    tanks.sort((a, b) => a.y - b.y); // far (small y) first

    for (const tk of tanks) {
      const d = tk.scale;
      const col = K.mix(K.mix(P.struct, P.haze, (1 - d) * 0.8), '#000', 0.08 + d * 0.28);
      const alpha = 0.55 + d * 0.4;
      const rad = tk.rad, bx = tk.bx, y = tk.y;
      const wallH = rad * 0.5 * (0.6 + d * 0.8); // tank wall height (the short cylinder under the lid)
      // shadow pool around the base in the water
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba('#000', 0.25 + d * 0.2);
      x.beginPath(); x.ellipse(bx + rad * 0.2, y + wallH + rad * 0.2, rad * 1.1, rad * 0.34, 0, 0, 7); x.fill();
      x.restore();
      // cylinder wall (lit side toward glow)
      const fromLeft = env.glowX < bx;
      const wallG = x.createLinearGradient(bx - rad, 0, bx + rad, 0);
      const lit = K.mix(col, P.spark, 0.4), shade = K.mix(col, '#000', 0.5);
      wallG.addColorStop(0, K.rgba(fromLeft ? shade : lit, alpha));
      wallG.addColorStop(0.5, K.rgba(col, alpha));
      wallG.addColorStop(1, K.rgba(fromLeft ? lit : shade, alpha));
      x.fillStyle = wallG;
      x.beginPath();
      x.moveTo(bx - rad, y); x.lineTo(bx - rad, y + wallH);
      x.ellipse(bx, y + wallH, rad, rad * 0.30, 0, Math.PI, 0, true);
      x.lineTo(bx + rad, y); x.closePath(); x.fill();
      // floating-roof lid (top ellipse) with concentric seams + a reflective pool
      const lidG = x.createRadialGradient(bx - rad * 0.3, y - rad * 0.12, rad * 0.05, bx, y, rad * 1.1);
      lidG.addColorStop(0, K.rgba(K.mix(col, P.spark, 0.45), alpha));
      lidG.addColorStop(0.6, K.rgba(col, alpha));
      lidG.addColorStop(1, K.rgba(shade, alpha));
      x.fillStyle = lidG;
      x.beginPath(); x.ellipse(bx, y, rad, rad * 0.30, 0, 0, 7); x.fill();
      // rim
      x.strokeStyle = K.rgba(K.mix(col, '#000', 0.4), alpha); x.lineWidth = Math.max(0.8, rad * 0.06);
      x.beginPath(); x.ellipse(bx, y, rad, rad * 0.30, 0, 0, 7); x.stroke();
      // concentric roof seams
      x.strokeStyle = K.rgba(K.mix(col, P.spark, 0.2), alpha * 0.5); x.lineWidth = Math.max(0.5, rad * 0.025);
      for (const fr of [0.7, 0.45, 0.22]) { x.beginPath(); x.ellipse(bx, y, rad * fr, rad * 0.30 * fr, 0, 0, 7); x.stroke(); }
      // a glint of dusk caught on the metal lid
      if (d > 0.3) K.bloom(x, bx - rad * 0.3, y - rad * 0.05, rad * 0.5, P.spark, 0.10 + d * 0.10);
      if (tk.flame) drawFlare(x, noise, seed, P, bx + rad * 0.4, y - rad * 0.2, rad * 0.6, P.flare, 0.7, false, r() * 6);
    }

    // a few tall stacks/towers breaking the plan with verticals (depth cue)
    for (let i = 0; i < 3; i++) {
      const bx = (0.1 + r() * 0.8) * W;
      const baseY = H * (0.4 + r() * 0.45);
      const hh = H * (0.18 + r() * 0.22);
      drawUnit(x, r() < 0.5 ? 'tower' : 'stack', bx, baseY, hh, hh * 0.24, K.mix(P.struct, '#000', 0.5), 0.7, r, P.struct, env.glowX);
      if (r() < 0.6) drawFlare(x, noise, seed, P, bx, baseY - hh, hh * 0.18, P.flare, 0.7, false, r() * 6);
    }

    // standing water glints in the lanes between tanks (near foreground)
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 80; i++) {
      const yy = H * (0.4 + r() * 0.6);
      const t = (yy - skyY) / (H - skyY);
      x.fillStyle = K.rgba(K.mix(P.struct, P.spark, r() * 0.5), 0.04 + r() * 0.07);
      x.fillRect(r() * W, yy, (3 + t * 14) * (0.4 + r()), 1.5);
    }
    x.restore();

    finish(x, P, W, H, noise, env, r, 0.58);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT 6 — FLARESTACK: a flare-stack hero up close, plant receding into smog
  // ════════════════════════════════════════════════════════════════════════
  function layoutFlarestack(x, p, P, W, H, seed, r, noise, env) {
    const horizonY = H * (0.66 + (r() - 0.5) * 0.08);
    // smoggier sky — push the flare's orange into it
    paintSky(x, P, W, horizonY, env);
    // heavy smog wash over the whole sky pulling toward flare orange
    x.save();
    x.globalCompositeOperation = 'screen';
    const sm = x.createLinearGradient(0, horizonY, 0, 0);
    sm.addColorStop(0, K.rgba(K.mix(P.flare, P.haze, 0.4), 0.28));
    sm.addColorStop(0.5, K.rgba(P.haze, 0.12));
    sm.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = sm; x.fillRect(0, 0, W, horizonY);
    x.restore();
    paintWater(x, P, W, H, horizonY);

    // the plant receding into smog behind: rows of units fading out, getting
    // hazier as they go back — strong atmospheric depth.
    const layers = 4;
    for (let L = layers - 1; L >= 0; L--) {
      const d = 1 - L / layers; // 0 far .. 1 near-ish (but all behind hero)
      const n = K.rint(r, 4, 7);
      for (let i = 0; i < n; i++) {
        const bx = r() * W;
        const types = ['tower', 'tank', 'stack', 'cooling', 'sphere'];
        const ty = K.pick(types, r);
        const baseY = horizonY - L * horizonY * 0.015;
        const h = horizonY * (0.10 + d * 0.30) * (ty === 'stack' ? 1.4 : 1) * (0.7 + r() * 0.5);
        const w = h * (ty === 'sphere' ? 0.85 : ty === 'tank' ? 0.9 : ty === 'cooling' ? 0.7 : 0.28);
        const fade = 0.18 + d * 0.45;
        const col = K.mix(K.mix(P.struct, P.haze, (1 - d) * 0.9), '#000', 0.05 + d * 0.2);
        drawUnit(x, ty, bx, baseY, h, w, col, fade, K.rng((bx * 11 + L) >>> 0), P.struct, env.glowX);
        if (ty === 'stack' && r() < 0.4) drawFlare(x, noise, seed, P, bx, baseY - h, horizonY * 0.04 * (0.6 + d), P.flare, 0.4 + d * 0.3, false, r() * 6);
      }
      // smog band between layers
      x.save();
      x.globalCompositeOperation = 'screen';
      x.fillStyle = K.rgba(K.mix(P.haze, P.flare, 0.15), 0.10 + (1 - d) * 0.10);
      x.fillRect(0, horizonY - horizonY * (0.30 + L * 0.10), W, horizonY * 0.32);
      x.restore();
    }

    // THE HERO FLARE STACK — huge, foreground, base in water, off to one side,
    // its giant flame raking up the frame with a thick smoke column.
    const hx = W * (r() < 0.5 ? 0.26 + r() * 0.10 : 0.64 + r() * 0.10);
    const stackTop = H * (0.20 + r() * 0.06);
    const stackBot = horizonY + (H - horizonY) * 0.10;
    const stackH = stackBot - stackTop;
    const sw = W * 0.05;
    // dark solid stack
    x.save();
    const fromLeft = env.glowX < hx;
    const sg = x.createLinearGradient(hx - sw, 0, hx + sw, 0);
    sg.addColorStop(0, K.rgba(K.mix(P.struct, '#000', fromLeft ? 0.35 : 0.7), 0.95));
    sg.addColorStop(0.5, K.rgba(K.mix(P.struct, '#000', 0.5), 0.95));
    sg.addColorStop(1, K.rgba(K.mix(P.struct, '#000', fromLeft ? 0.7 : 0.35), 0.95));
    x.fillStyle = sg;
    x.beginPath();
    x.moveTo(hx - sw, stackBot); x.lineTo(hx - sw * 0.45, stackTop);
    x.lineTo(hx + sw * 0.45, stackTop); x.lineTo(hx + sw, stackBot); x.closePath(); x.fill();
    // ladder + platform rings up the stack
    x.strokeStyle = K.rgba(K.mix(P.struct, '#000', 0.2), 0.6); x.lineCap = 'round';
    const segs = 16;
    for (let i = 1; i < segs; i++) {
      const t = i / segs; const y = stackBot - stackH * t; const pw = sw + (sw * 0.45 - sw) * t;
      x.lineWidth = Math.max(0.7, sw * 0.06);
      x.beginPath(); x.moveTo(hx - pw, y); x.lineTo(hx + pw, y); x.stroke();
    }
    // platform crown near the tip
    x.fillStyle = K.rgba(K.mix(P.struct, '#000', 0.4), 0.9);
    x.fillRect(hx - sw * 0.9, stackTop + stackH * 0.04, sw * 1.8, sw * 0.5);
    K.mottle(x, hx - sw, stackTop, sw * 2, stackH, K.mix(P.struct, '#000', 0.3), 80, r, 'overlay');
    x.restore();

    // the GIANT hero flame — big, raking, with a heavy smoke plume bending in wind
    const fscale = stackH * 0.40;
    // big base bloom — rust-orange led, kept off pure white so it doesn't blow out
    K.bloom(x, hx, stackTop, fscale * 2.6, P.flare, 0.30);
    K.bloom(x, hx, stackTop, fscale * 1.2, K.mix(P.flare, P.spark, 0.2), 0.22);
    drawFlare(x, noise, seed, P, hx, stackTop, fscale, P.flare, 0.82, false, seed * 0.3);
    // extra licking tongues for size
    drawFlare(x, noise, seed, P, hx - sw * 0.4, stackTop, fscale * 0.7, P.flare, 0.8, false, seed * 0.5 + 2);
    drawFlare(x, noise, seed, P, hx + sw * 0.4, stackTop, fscale * 0.65, K.mix(P.flare, P.spark, 0.2), 0.8, false, seed * 0.5 + 4);
    // thick wind-bent smoke column off the tip
    x.save();
    x.globalCompositeOperation = 'screen';
    const wind = (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.8);
    for (let s = 1; s <= 12; s++) {
      const t = s / 12;
      const sy = stackTop - fscale * (0.9 + s * 0.45);
      const sx = hx + wind * fscale * t * t * 2.2 + noise.fbm(s * 1.5, seed * 0.03, 3) * fscale * 0.8;
      K.bloom(x, sx, sy, fscale * (0.5 + s * 0.28), K.mix(P.haze, P.sky1, 0.55), 0.10);
    }
    x.restore();

    // reflection of the hero flame in the water
    x.save();
    x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
    K.bloom(x, hx, horizonY + (horizonY - stackTop) * 0.5, fscale * 2, P.flare, 0.22);
    drawFlare(x, noise, seed, P, hx, horizonY + (horizonY - stackTop), fscale * 0.9, K.mix(P.flare, P.spark, 0.3), 0.7, true, seed * 0.3 + 1);
    x.restore();
    rippleWater(x, noise, seed, P, W, H, horizonY, env.rip);

    if (p.underwaterFlare) underwaterFlare(x, noise, seed, P, W, H, horizonY, K.clamp((hx / W) + (r() - 0.5) * 0.4, 0.15, 0.85) * W, r);
    waterline(x, P, W, H, horizonY, env, r);
    finish(x, P, W, H, noise, env, r, 0.6);
  }

  // ── DISPATCH ────────────────────────────────────────────────────────────
  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r, seed), P = p.pal;
    const W = p.layout.W, H = p.layout.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const env = {
      night: p.hour === 'First Dark',
      blue: p.hour === 'Blue Hour',
      smog: p.hour === 'Smog Dusk',
      misted: p.tide === 'Misted',
      glowX: p.focal * W,
      rip: p.tide === 'Glass Mirror' ? 0.30 : p.tide === 'Rippled' ? 1.0 : 0.6,
    };
    env.skyBright = env.night ? 0.7 : env.blue ? 0.95 : 1.0;

    switch (p.layout.name) {
      case 'Monolith':   layoutMonolith(x, p, P, W, H, seed, r, noise, env); break;
      case 'Pipeworks':  layoutPipeworks(x, p, P, W, H, seed, r, noise, env); break;
      case 'Floodplain': layoutFloodplain(x, p, P, W, H, seed, r, noise, env); break;
      case 'Tankfarm':   layoutTankfarm(x, p, P, W, H, seed, r, noise, env); break;
      case 'Flarestack': layoutFlarestack(x, p, P, W, H, seed, r, noise, env); break;
      default:           layoutTideline(x, p, P, W, H, seed, r, noise, env); break;
    }
    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'tideworks', draw, traits };
})();
