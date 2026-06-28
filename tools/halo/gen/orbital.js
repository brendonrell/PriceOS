/* ORBITAL — a zero-gravity bazaar tumbling in orbit.
 * Hundreds of small market stalls, cargo pods, lantern-drones and banners
 * drift in a loose swarm over the bright limb of a planet below. No up/down:
 * stalls tilt at every angle, a river of crowd-lights threads through the
 * cluster. A floating souk in space — warm goods against cool space.
 * TROPICAL ORBIT palette: coral / turquoise / cream-gold over a saturated
 * planet-limb glow.  Depth via atmospheric perspective: far stalls hazier,
 * desaturated, smaller; near stalls bold, lit, contrasty. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways — all within the TROPICAL ORBIT family. `space` pairs are the
  // deep-space ground wash (top→bottom-ish), `limb` is the saturated planet
  // glow arc, `atmo` the atmosphere bloom band, `warm`/`cool`/`gold` the goods
  // light palette, `haze` the volumetric fog tint.
  const PALS = [
    { name: 'Tropical Orbit', space0: '#0a0e2a', space1: '#04030f', limb: '#ff5e5e', atmo: '#ffb070',
      warm: '#ff5e5e', cool: '#2ee0d0', gold: '#ffe0a0', haze: '#ff8a6a' },
    { name: 'Dawn Souk',      space0: '#1a1038', space1: '#070314', limb: '#ff7e4e', atmo: '#ffd0a0',
      warm: '#ff7a5e', cool: '#3ee0c0', gold: '#ffe8b0', haze: '#ffa070' },
    { name: 'Teal Tide',      space0: '#04162e', space1: '#020812', limb: '#1fb8c8', atmo: '#7ef0e0',
      warm: '#ff6e6e', cool: '#2ee0d0', gold: '#ffe0a0', haze: '#3ed0c8' },
    { name: 'Ember Belt',     space0: '#1c0820', space1: '#0a0208', limb: '#ff4e6e', atmo: '#ffa080',
      warm: '#ff5e5e', cool: '#2ed0d8', gold: '#ffd890', haze: '#ff7a6a' },
    { name: 'Goldspice',      space0: '#180e22', space1: '#06040e', limb: '#ffae4e', atmo: '#ffe0a0',
      warm: '#ff6e5e', cool: '#3ee0c8', gold: '#ffe8b0', haze: '#ffbe7a' },
    { name: 'Deep Lagoon',    space0: '#031826', space1: '#01060e', limb: '#2ec8c0', atmo: '#a0f0e8',
      warm: '#ff6e6e', cool: '#4ef0d8', gold: '#ffe0a0', haze: '#2ec0c8' },
  ];

  const FMTS = [
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1240, H: 940,  t: 'Landscape' },
    { W: 980,  H: 1240, t: 'Portrait' },
  ];

  // Where the planet limb sits + how the curve runs.
  const HORIZONS = ['Low Curve', 'Diagonal Rise', 'Diagonal Fall', 'Deep Limb'];
  const TIMES = ['Day Side', 'Terminator', 'Night Trade'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const horizon = K.pick(HORIZONS, r);
    const time = K.pick(TIMES, r);
    const density = 0.7 + r() * 0.6;       // how teeming the swarm is
    const focalX = 0.32 + r() * 0.36;      // where the cluster's focal weight sits
    const focalY = 0.30 + r() * 0.30;
    return { pal, fmt, horizon, time, density, focalX, focalY };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Horizon: p.horizon, Time: p.time,
      Density: p.density > 1.05 ? 'Teeming' : p.density > 0.85 ? 'Busy' : 'Loose' };
  }

  // ── planet limb: a big saturated arc with atmosphere bloom at the edge ──
  function drawLimb(x, W, H, P, noise, r) {
    const { pal, horizon } = P;
    // Geometry of the curved horizon. cx/cy = planet centre (mostly off-canvas),
    // R huge so the arc reads as a gentle curve. Angle tilts the curve.
    let cx, cy, R, tilt;
    if (horizon === 'Low Curve')      { cx = W * 0.5;  cy = H * 1.55; R = H * 1.25; tilt = 0; }
    else if (horizon === 'Diagonal Rise') { cx = W * 1.3; cy = H * 1.7; R = H * 1.55; tilt = -0.28; }
    else if (horizon === 'Diagonal Fall') { cx = W * -0.3; cy = H * 1.7; R = H * 1.55; tilt = 0.28; }
    else                              { cx = W * 0.45; cy = H * 1.85; R = H * 1.45; tilt = 0.06; } // Deep Limb

    // 1) saturated planet body: radial gradient from the limb edge inward.
    const g = x.createRadialGradient(cx, cy, R * 0.62, cx, cy, R * 1.04);
    g.addColorStop(0, K.rgba(K.mix(pal.limb, '#000', 0.55), 0));
    g.addColorStop(0.78, K.rgba(K.mix(pal.limb, '#1a0a18', 0.2), 0.55));
    g.addColorStop(0.94, K.rgba(pal.limb, 0.95));
    g.addColorStop(1.0,  K.rgba(K.mix(pal.limb, '#fff', 0.15), 0.7));
    x.save();
    x.translate(cx, cy); x.rotate(tilt); x.translate(-cx, -cy);
    x.fillStyle = g;
    x.fillRect(-W * 1.5, -H * 1.5, W * 4, H * 4);

    // 2) soft cloud belts on the planet body — concentric arcs following the
    //    limb curvature (not horizontal stripes), so it reads as a planet not
    //    a table. Clipped to the disk, very low opacity, fbm-modulated.
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
    x.globalCompositeOperation = 'overlay';
    for (let b = 0; b < 30; b++) {
      const t = b / 30;
      const ringR = R * (0.55 + t * 0.48);
      const n = noise.fbm(t * 3.6 + 5, 2.3, 4);
      const bandCol = K.mix(pal.limb, n > 0 ? pal.atmo : '#1a0610', 0.2 + Math.abs(n) * 0.45);
      x.strokeStyle = K.rgba(bandCol, 0.05 + Math.abs(n) * 0.12);
      x.lineWidth = R * (0.012 + Math.abs(n) * 0.05);
      x.beginPath();
      x.arc(cx, cy, ringR, Math.PI * 1.05, Math.PI * 1.95);
      x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    // subtle mottled storm spots
    for (let s = 0; s < 14; s++) {
      const ang = Math.PI * (1.1 + r() * 0.8);
      const rr = R * (0.6 + r() * 0.42);
      const mx = cx + Math.cos(ang) * rr, my = cy + Math.sin(ang) * rr;
      K.bloom(x, mx, my, R * (0.03 + r() * 0.05), r() < 0.5 ? pal.atmo : K.mix(pal.limb, '#000', 0.4), 0.06);
    }
    x.restore();

    // 3) atmosphere bloom — bright halo riding the limb edge.
    x.save();
    x.translate(cx, cy); x.rotate(tilt); x.translate(-cx, -cy);
    const ga = x.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.18);
    ga.addColorStop(0, K.rgba(pal.atmo, 0));
    ga.addColorStop(0.35, K.rgba(pal.atmo, 0.5));
    ga.addColorStop(0.6, K.rgba(K.mix(pal.atmo, pal.limb, 0.4), 0.28));
    ga.addColorStop(1, K.rgba(pal.atmo, 0));
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = ga;
    x.fillRect(-W, -H, W * 3, H * 3);
    x.restore();

    return { cx, cy, R, tilt };
  }

  // depth lighting helper: tilted lit box ("stall"). depth 0=far ... 1=near.
  function drawStall(x, sx, sy, size, rot, depth, P, r, noise) {
    const { pal, time } = P;
    // atmospheric perspective: far stalls washed toward haze + low contrast.
    const fade = 1 - depth;                          // 0 near .. 1 far
    const hazeMix = 0.12 + fade * 0.62;
    const w = size, h = size * (0.6 + r() * 0.7);
    // pick goods light colour
    const tone = r();
    let lit = tone < 0.42 ? pal.warm : tone < 0.72 ? pal.gold : pal.cool;
    // night trade biases warmer/brighter window glow
    if (time === 'Night Trade') lit = K.mix(lit, pal.gold, 0.25);

    x.save();
    x.translate(sx, sy);
    x.rotate(rot);

    // soft drop bloom under near stalls for depth/AO
    if (depth > 0.4) {
      K.softShadow(x, 2, 4, size * 1.5, 0.18 * depth);
    }

    // body — dark hull, hazed for distance
    const hull = K.mix('#0c0a16', pal.haze, hazeMix * 0.5);
    x.fillStyle = K.rgba(hull, 0.35 + depth * 0.6);
    roundRect(x, -w / 2, -h / 2, w, h, size * 0.12);
    x.fill();

    // lit edge / rim light from limb direction (down-ish)
    x.strokeStyle = K.rgba(K.mix(lit, pal.atmo, 0.3), (0.25 + depth * 0.5) * (1 - fade * 0.4));
    x.lineWidth = Math.max(0.6, size * 0.04 * depth);
    roundRect(x, -w / 2, -h / 2, w, h, size * 0.12);
    x.stroke();

    // glowing window/awning panel — the "goods" light
    const pw = w * (0.34 + r() * 0.3), ph = h * (0.3 + r() * 0.3);
    const px = -w / 2 + r() * (w - pw), py = -h / 2 + r() * (h - ph);
    const glowA = (0.5 + depth * 0.5) * (0.5 + r() * 0.5);
    x.fillStyle = K.rgba(lit, glowA);
    roundRect(x, px, py, pw, ph, size * 0.08);
    x.fill();

    // a second tiny lit slit for busier near stalls
    if (depth > 0.55 && r() < 0.6) {
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.3), glowA * 0.8);
      x.fillRect(px + pw * 0.1, py - h * 0.18, pw * 0.7, h * 0.08);
    }

    x.restore();

    // additive bloom halo around the lit panel (in world space, near only)
    if (depth > 0.3) {
      const wx = sx + Math.cos(rot) * 0 - Math.sin(rot) * 0;
      K.bloom(x, sx, sy, size * (0.9 + depth), lit, 0.06 + depth * 0.12);
    }
  }

  function roundRect(x, X, Y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    x.beginPath();
    x.moveTo(X + rad, Y);
    x.arcTo(X + w, Y, X + w, Y + h, rad);
    x.arcTo(X + w, Y + h, X, Y + h, rad);
    x.arcTo(X, Y + h, X, Y, rad);
    x.arcTo(X, Y, X + w, Y, rad);
    x.closePath();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const P = params(r);
    const { fmt, pal } = P;
    cv.width = fmt.W; cv.height = fmt.H;
    const W = cv.width, H = cv.height;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // ── deep-space ground wash ──
    const bg = x.createLinearGradient(0, 0, W * 0.2, H);
    bg.addColorStop(0, pal.space0);
    bg.addColorStop(1, pal.space1);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // faint nebula clouds in space (soft blooms, not a regular haze grid)
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 10; i++) {
      const nx = r() * W, ny = r() * H * 0.7;
      const nr = Math.min(W, H) * (0.18 + r() * 0.3);
      const ncol = K.mix(pal.space0, r() < 0.5 ? pal.cool : pal.haze, 0.35 + r() * 0.3);
      const ng = x.createRadialGradient(nx, ny, 0, nx, ny, nr);
      ng.addColorStop(0, K.rgba(ncol, 0.06 + r() * 0.05));
      ng.addColorStop(1, K.rgba(ncol, 0));
      x.fillStyle = ng; x.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }
    x.restore();

    // ── star grain (background stars, varying brightness) ──
    const nStars = Math.floor(W * H / 1400);
    for (let i = 0; i < nStars; i++) {
      const sxp = r() * W, syp = r() * H;
      const br = r();
      const sz = br > 0.94 ? 1.8 : br > 0.7 ? 1.1 : 0.7;
      const col = br > 0.9 ? pal.gold : br > 0.7 ? '#cfe6ff' : '#9fb0d0';
      x.fillStyle = K.rgba(col, 0.2 + br * 0.6);
      x.fillRect(sxp, syp, sz, sz);
    }
    // a few brighter star blooms
    for (let i = 0; i < 8; i++) {
      K.bloom(x, r() * W, r() * H * 0.7, 8 + r() * 14, i % 2 ? pal.gold : '#dff0ff', 0.05 + r() * 0.06);
    }

    // ── planet limb ──
    const limb = drawLimb(x, W, H, P, noise, r);

    // ── the swarm: hundreds of stalls/pods at every angle, depth-sorted ──
    // Build a focal cluster cloud + scatter. Depth drives size & atmosphere.
    const cx0 = W * P.focalX, cy0 = H * P.focalY;
    const items = [];
    const baseCount = Math.floor(170 * P.density);

    for (let i = 0; i < baseCount; i++) {
      // cluster: gaussian-ish toward focal, with a long tail of scattered ones
      const inCluster = r() < 0.62;
      let px, py, depth;
      if (inCluster) {
        const ang = r() * Math.PI * 2;
        const rad = Math.pow(r(), 0.7) * Math.min(W, H) * 0.46;
        px = cx0 + Math.cos(ang) * rad * (0.9 + r() * 0.4);
        py = cy0 + Math.sin(ang) * rad * (0.7 + r() * 0.4);
        // depth correlated with distance from focal centre + noise
        depth = K.clamp(1 - rad / (Math.min(W, H) * 0.5) + (r() - 0.5) * 0.5, 0.02, 1);
      } else {
        px = r() * W; py = r() * H * 0.92;
        depth = Math.pow(r(), 1.6) * 0.7; // scattered ones tend farther
      }
      // keep most stalls above the deep planet body but allow some near limb
      const size = (4 + depth * depth * 46) * (0.7 + r() * 0.6);
      const rot = (r() - 0.5) * Math.PI; // every angle
      items.push({ px, py, depth, size, rot, kind: r() });
    }
    // a few HEROIC foreground stalls near the focal — big, sharp, fully lit,
    // anchoring the depth read.
    const nHero = 3 + Math.floor(r() * 3);
    for (let i = 0; i < nHero; i++) {
      const ang = r() * Math.PI * 2;
      const rad = Math.pow(r(), 0.6) * Math.min(W, H) * 0.28;
      items.push({
        px: cx0 + Math.cos(ang) * rad,
        py: cy0 + Math.sin(ang) * rad * 0.85,
        depth: 0.9 + r() * 0.1,
        size: 52 + r() * 38,
        rot: (r() - 0.5) * Math.PI,
        kind: r(),
      });
    }

    // depth sort: far first
    items.sort((a, b) => a.depth - b.depth);

    // light-threads: a river of crowd-lights threading through the cluster.
    // Draw under the near stalls. Build a few flowing polylines via curl flow.
    const nThreads = 5 + Math.floor(P.density * 3);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let t = 0; t < nThreads; t++) {
      let lx = cx0 + (r() - 0.5) * W * 0.5;
      let ly = cy0 + (r() - 0.5) * H * 0.5;
      const threadCol = K.mix(t % 2 ? pal.cool : pal.gold, pal.warm, r() * 0.4);
      const steps = 80 + Math.floor(r() * 60);
      let prevx = lx, prevy = ly;
      for (let s = 0; s < steps; s++) {
        const c = K.curl(noise, lx + t * 40, ly + t * 40, 2);
        lx += c[0] * 60 + (r() - 0.5) * 6;
        ly += c[1] * 60 + (r() - 0.5) * 6;
        if (lx < -50 || lx > W + 50 || ly < -50 || ly > H + 50) break;
        const a = 0.06 + 0.10 * Math.sin(s / steps * Math.PI);
        x.strokeStyle = K.rgba(threadCol, a);
        x.lineWidth = 1 + Math.sin(s / steps * Math.PI) * 1.6;
        x.beginPath(); x.moveTo(prevx, prevy); x.lineTo(lx, ly); x.stroke();
        // crowd-light dots along the thread
        if (s % 4 === 0) {
          x.fillStyle = K.rgba(K.mix(threadCol, '#fff', 0.3), a * 1.6);
          x.fillRect(lx, ly, 1.4, 1.4);
        }
        prevx = lx; prevy = ly;
      }
    }
    x.restore();

    // banners: thin tilted strips, scattered with the swarm (drawn mid-depth)
    for (let i = 0; i < Math.floor(40 * P.density); i++) {
      const depth = Math.pow(r(), 1.3);
      const bx = cx0 + (r() - 0.5) * Math.min(W, H) * 0.8;
      const by = cy0 + (r() - 0.5) * Math.min(W, H) * 0.7;
      const len = (10 + depth * 60) * (0.6 + r());
      const wdt = Math.max(1.2, len * 0.06);
      const rot = (r() - 0.5) * Math.PI;
      const tone = r();
      const col = tone < 0.4 ? pal.warm : tone < 0.7 ? pal.cool : pal.gold;
      const fade = 1 - depth;
      x.save();
      x.translate(bx, by); x.rotate(rot);
      x.fillStyle = K.rgba(K.mix(col, pal.haze, fade * 0.5), 0.25 + depth * 0.55);
      x.fillRect(-len / 2, -wdt / 2, len, wdt);
      x.restore();
    }

    // draw stalls far→near
    for (const it of items) {
      drawStall(x, it.px, it.py, it.size, it.rot, it.depth, P, r, noise);
    }

    // lantern-drones: bloom dots floating among the swarm (foreground sparkle)
    const nDrones = Math.floor(90 * P.density);
    for (let i = 0; i < nDrones; i++) {
      const depth = Math.pow(r(), 1.4);
      const dx = r() * W, dy = r() * H * 0.96;
      const tone = r();
      const col = tone < 0.4 ? pal.warm : tone < 0.7 ? pal.gold : pal.cool;
      const rad = 2 + depth * depth * 22;
      K.bloom(x, dx, dy, rad, col, 0.08 + depth * 0.18);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.4 + depth * 0.5);
      x.fillRect(dx - depth, dy - depth, 1 + depth * 2, 1 + depth * 2);
    }

    // ── volumetric haze for depth — soft drifting fog blooms (no tiled grid) ──
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 22; i++) {
      const fx = r() * W, fy = H * (0.4 + r() * 0.6); // lower scene hazier
      const fr = Math.min(W, H) * (0.12 + r() * 0.26);
      const fn = (noise.fbm(fx / 200, fy / 200, 3) + 1) / 2;
      const fcol = K.mix(pal.haze, pal.atmo, r() * 0.5);
      const fg = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fg.addColorStop(0, K.rgba(fcol, 0.04 + fn * 0.07));
      fg.addColorStop(1, K.rgba(fcol, 0));
      x.fillStyle = fg; x.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    }
    x.restore();
    // a denser fog band hugging the limb edge (lower scene hazier)
    const fog = x.createLinearGradient(0, H * 0.45, 0, H);
    fog.addColorStop(0, K.rgba(pal.haze, 0));
    fog.addColorStop(1, K.rgba(pal.haze, 0.2));
    x.save(); x.globalCompositeOperation = 'screen';
    x.fillStyle = fog; x.fillRect(0, 0, W, H);
    x.restore();

    // ── finishing: grain + vignette ──
    K.grain(x, W, H, 90, r);
    K.vignette(x, W, H, 0.55);

    return { aspect: W / H };
  }

  return { draw, traits };
})();
