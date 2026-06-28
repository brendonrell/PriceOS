/* SOLARIA — surreal celestial vista.
 * An impossible sky over a hazy horizon: several geometric suns / ringed
 * planets / stacked moons hung at once ("real but off" = more than one sun).
 * Layered atmospheric strata, deep volumetric haze, soft light scatter,
 * graded murk near the horizon, a thin silhouetted horizon with tiny
 * structures/landforms for scale, drifting motes & distant flocks.
 * Semi-abstract, saturated, future-evoking. NOT cyberpunk, NOT outrun:
 * no neat sun-over-grid, no regular mirror-reflection stripes, no chrome.
 * Bodies are weighty & strange (mottled, eclipsed, half-lost in haze)
 * rather than clean shaded spheres. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Each palette = its own saturated jewel duskscape.
  // sky1=zenith, sky2=horizon glow, sun=primary body, body=secondary bodies,
  // haze=strata/atmosphere wash, ink=silhouettes & deep murk.
  // SOLARIA territory = WARM CELESTIAL DUSK: ambers, coral, gold, ember,
  // with deep violet/plum night skies as the cool counterpoint. Reads
  // unmistakably "warm gold sunset" from afar; internal variety stays warm.
  const PALS = [
    { name: 'Tangerine Dusk', sky1: '#2c0844', sky2: '#ff6f12', sun: '#ffd24a', body: '#ff5e8a', haze: '#ff9a4d', ink: '#160320' },
    { name: 'Rust Mirage',    sky1: '#270a12', sky2: '#f0431f', sun: '#ffc24a', body: '#ff8158', haze: '#f06a3a', ink: '#120305' },
    { name: 'Ember Plum',     sky1: '#1d0730', sky2: '#e85a2a', sun: '#ffcf5e', body: '#ff7e9e', haze: '#f08a4a', ink: '#0e0418' },
    { name: 'Coral Veil',     sky1: '#321034', sky2: '#ff7a5c', sun: '#ffe0a0', body: '#ff96b0', haze: '#ffae7a', ink: '#180a1a' },
    { name: 'Gilded Murk',    sky1: '#241a0a', sky2: '#f59a1e', sun: '#ffe487', body: '#ffb24a', haze: '#ffc25e', ink: '#120c04' },
    { name: 'Magenta Ember',  sky1: '#2a0826', sky2: '#ff4d6d', sun: '#ffce6a', body: '#ff85b0', haze: '#ff7a5a', ink: '#140314' },
    { name: 'Amber Nocturne', sky1: '#160a36', sky2: '#ff8a2a', sun: '#ffda7a', body: '#d98bff', haze: '#ffa84e', ink: '#0a0524' },
    { name: 'Ash Rose',       sky1: '#241426', sky2: '#f0826a', sun: '#ffe6cf', body: '#ff9bb0', haze: '#f0a37a', ink: '#100a14' },
  ];
  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  const HORIZONS = ['Skyline', 'Mesa', 'Spires', 'Reef', 'Dunes'];
  const PHASES = ['Dawn', 'Zenith', 'Dusk', 'Eclipse'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const horizon = K.pick(HORIZONS, r);
    const phase = K.pick(PHASES, r);
    const bodies = K.rint(r, 2, 5);
    const rings = r() < 0.55;
    const aurora = r() < 0.42;
    const event = r() < 0.07 ? K.pick(['Double Eclipse', 'Green Flash', 'Ringfall', 'Mirrored Sky'], r) : null;
    return { pal, fmt, horizon, phase, bodies, rings, aurora, event };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    const t = { Palette: p.pal.name, Sky: p.fmt.t, Horizon: p.horizon, Phase: p.phase, Bodies: p.bodies >= 4 ? 'Many' : 'Few' };
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── deep sky: zenith→horizon with a soft glow lobe at the horizon ── */
  function skyGradient(x, P, W, H, hY) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.sky1, '#000', 0.18));
    g.addColorStop(0.30, P.sky1);
    g.addColorStop(Math.max(0.42, (hY / H) * 0.66), K.mix(P.sky1, P.sky2, 0.5));
    g.addColorStop(Math.min(0.97, hY / H), K.mix(P.sky2, P.sun, 0.12));
    g.addColorStop(1, K.mix(P.sky2, P.ink, 0.4));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // broad warm glow seated on the horizon (atmospheric scatter)
    const gl = x.createRadialGradient(W * 0.5, hY, 0, W * 0.5, hY, W * 0.75);
    x.save(); x.globalCompositeOperation = 'screen';
    gl.addColorStop(0, K.rgba(P.sky2, 0.28)); gl.addColorStop(0.5, K.rgba(P.sky2, 0.1)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, H); x.restore();
    // cool plum/violet counterpoint high in the zenith → tonal depth on warm seeds
    const cz = x.createLinearGradient(0, 0, 0, hY * 0.7);
    x.save(); x.globalCompositeOperation = 'screen';
    cz.addColorStop(0, K.rgba(K.mix(P.sky1, '#5a3aa0', 0.45), 0.32)); cz.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = cz; x.fillRect(0, 0, W, hY * 0.7); x.restore();
  }

  /* ── volumetric haze: several soft fbm sheets at different scales/blends.
       large scales only → soft cloud masses, NOT vertical curtain streaks ── */
  function volHaze(x, P, W, H, hY, noise, r) {
    // big slow strata
    K.hazeSheet(x, W, Math.floor(hY * 1.06), noise, K.mix(P.haze, P.sky1, 0.2), 0.14, 480 + r() * 220, 'screen');
    // mid drift, warmer
    K.hazeSheet(x, W, Math.floor(hY * 1.06), noise, K.mix(P.haze, P.sun, 0.3), 0.09, 300 + r() * 140, 'screen');
    // fine dust grain over the whole sky (kept low-contrast)
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.haze, 0.5), 0.035, 130, 'overlay');
  }

  /* ── soft horizontal atmospheric layering, banded but irregular & feathered ── */
  function strata(x, P, W, hY, r, noise) {
    x.save(); x.globalCompositeOperation = 'screen';
    const n = K.rint(r, 7, 12);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const yc = hY * (0.34 + 0.66 * t) - r() * 14;
      const h = 18 + r() * 70 * (0.5 + t);
      const a = (0.03 + t * 0.1) * (0.5 + r());
      // feathered top + bottom via vertical gradient
      const gg = x.createLinearGradient(0, yc - h, 0, yc + h);
      const col = K.mix(P.haze, P.sun, t * 0.45);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(0.5, K.rgba(col, a));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      // wavy ribbon, not a flat bar
      x.fillStyle = gg;
      x.beginPath(); x.moveTo(0, yc - h);
      for (let xx = 0; xx <= W; xx += 24) { const yy = yc - h + noise.fbm(xx / 220, i * 3.1, 3) * 22; x.lineTo(xx, yy); }
      for (let xx = W; xx >= 0; xx -= 24) { const yy = yc + h + noise.fbm(xx / 200, i * 3.1 + 9, 3) * 22; x.lineTo(xx, yy); }
      x.closePath(); x.fill();
    }
    x.restore();
  }

  /* ── aurora-ish vertical light curtains, soft & broken ── */
  function auroraVeil(x, P, W, H, hY, r, noise) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const bands = K.rint(r, 2, 4);
    for (let b = 0; b < bands; b++) {
      const baseX = r() * W, amp = W * (0.05 + r() * 0.1), col = K.mix(P.body, P.haze, r());
      // draw as a soft filled wedge fading upward
      x.beginPath();
      const pts = [];
      for (let yy = hY; yy >= hY * 0.05; yy -= 8) {
        const t = (hY - yy) / hY;
        const xx = baseX + Math.sin(t * 5 + b * 2) * amp * t + noise.fbm(yy / 110, b * 12, 3) * 70;
        pts.push([xx, yy]);
      }
      const wTop = 40 + r() * 60, wBot = 140 + r() * 160;
      x.beginPath();
      for (let i = 0; i < pts.length; i++) { const t = i / pts.length; const w = wBot + (wTop - wBot) * t; x[i ? 'lineTo' : 'moveTo'](pts[i][0] - w / 2, pts[i][1]); }
      for (let i = pts.length - 1; i >= 0; i--) { const t = i / pts.length; const w = wBot + (wTop - wBot) * t; x.lineTo(pts[i][0] + w / 2, pts[i][1]); }
      x.closePath();
      const gg = x.createLinearGradient(0, hY * 0.05, 0, hY);
      gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.7, K.rgba(col, 0.05 + r() * 0.04)); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg; x.fill();
    }
    x.restore();
  }

  /* ── a weighty, strange celestial body: scatter, mottled surface,
       terminator shading, partial haze occlusion ── */
  function body(x, P, noise, cx, cy, rad, col, r, opts) {
    opts = opts || {};
    const isSun = !!opts.isSun, rings = !!opts.rings, lit = opts.lit == null ? r() < 0.6 : opts.lit;
    // atmospheric scatter halo (big, soft)
    K.bloom(x, cx, cy, rad * (isSun ? 3.6 : 2.3), isSun ? P.sun : col, isSun ? 0.34 : 0.16);
    K.bloom(x, cx, cy, rad * (isSun ? 1.7 : 1.35), isSun ? K.mix(P.sun, '#fff', 0.3) : K.mix(col, '#fff', 0.2), isSun ? 0.4 : 0.2);

    // base disc — flatter, jewel-like (not a glossy CGI ball)
    const lx = cx - rad * 0.32, ly = cy - rad * 0.30;
    const g = x.createRadialGradient(lx, ly, rad * 0.1, cx, cy, rad * 1.05);
    g.addColorStop(0, K.mix(col, '#ffffff', isSun ? 0.55 : 0.34));
    g.addColorStop(0.55, col);
    g.addColorStop(0.86, K.mix(col, P.ink, 0.42));
    g.addColorStop(1, K.mix(col, P.ink, 0.62));
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

    // surface mottling — fbm patches (weight & strangeness). Jittered, slightly
    // overlapping cells so no regular grid shows through at any scale.
    x.globalCompositeOperation = 'overlay';
    const step = Math.max(2, Math.floor(rad / 46));
    for (let yy = cy - rad; yy < cy + rad; yy += step) {
      for (let xx = cx - rad; xx < cx + rad; xx += step) {
        const jx = xx + (r() - 0.5) * step, jy = yy + (r() - 0.5) * step;
        const n = noise.fbm((jx) / (rad * 0.5), (jy) / (rad * 0.5), 5, 0.55, 2.2);
        if (n > 0.02) { x.fillStyle = K.rgba(K.mix(col, '#fff', 0.5), Math.min(0.5, n * 0.4)); x.fillRect(jx, jy, step * 1.6, step * 1.6); }
        else if (n < -0.06) { x.fillStyle = K.rgba(K.mix(col, P.ink, 0.7), Math.min(0.45, -n * 0.4)); x.fillRect(jx, jy, step * 1.6, step * 1.6); }
      }
    }
    // banding for the "planet" feel on bigger bodies
    if (!isSun && rad > 50 && r() < 0.6) {
      x.globalCompositeOperation = 'overlay';
      const bn = K.rint(r, 3, 7);
      for (let i = 0; i < bn; i++) {
        const by = cy - rad + (i + r() * 0.6) * (2 * rad / bn);
        x.fillStyle = K.rgba(i % 2 ? K.mix(col, '#fff', 0.4) : K.mix(col, P.ink, 0.5), 0.12 + r() * 0.1);
        x.fillRect(cx - rad, by, rad * 2, (2 * rad / bn) * (0.4 + r() * 0.5));
      }
    }
    // terminator: dark crescent on the unlit side (strange, off lighting)
    x.globalCompositeOperation = 'multiply';
    const tg = x.createRadialGradient(lx, ly, rad * 0.2, cx + rad * 0.25, cy + rad * 0.25, rad * 1.5);
    tg.addColorStop(0, 'rgba(255,255,255,1)');
    tg.addColorStop(0.55, 'rgba(255,255,255,1)');
    tg.addColorStop(1, K.rgba(P.ink, 0.85));
    x.fillStyle = tg; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();

    // sun gets a hot core + soft concentric corona rings
    if (isSun) {
      K.sheen(x, lx, ly, rad * 0.8, K.mix(P.sun, '#fff', 0.5), 0.5);
      if (r() < 0.7) {
        x.save(); x.globalCompositeOperation = 'screen';
        for (let i = 1; i <= 3; i++) { x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.08); x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, rad * (1.08 + i * 0.16), 0, Math.PI * 2); x.stroke(); }
        x.restore();
      }
    } else {
      // small specular kiss
      K.sheen(x, lx, ly, rad * 0.5, K.mix(col, '#fff', 0.6), 0.3);
    }

    // planetary ring — irregular, dusty, not a clean decal
    if (rings) {
      x.save(); x.translate(cx, cy); x.rotate(-0.5 + r() * 0.6); x.scale(1, 0.22 + r() * 0.1);
      x.globalCompositeOperation = 'screen';
      const rr0 = rad * (1.45 + r() * 0.3);
      for (let k = 0; k < 5; k++) {
        const rr = rr0 + k * rad * (0.07 + r() * 0.04);
        x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.4 - k * 0.05), 0.18 - k * 0.02);
        x.lineWidth = rad * (0.05 + r() * 0.04);
        x.beginPath(); x.arc(0, 0, rr, 0.1 + r() * 0.3, Math.PI * 2 - r() * 0.3); x.stroke();
      }
      x.restore();
      // ring shadow band across disc front
      x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
      x.globalCompositeOperation = 'multiply';
      x.translate(cx, cy); x.rotate(-0.5 + r() * 0.6); x.scale(1, 0.24);
      x.strokeStyle = K.rgba(P.ink, 0.3); x.lineWidth = rad * 0.12;
      x.beginPath(); x.arc(0, 0, rad * 1.55, Math.PI * 0.1, Math.PI * 0.9); x.stroke();
      x.restore();
    }
  }

  function eclipse(x, P, noise, cx, cy, rad, r) {
    // huge corona scatter
    K.bloom(x, cx, cy, rad * 4.2, P.sun, 0.5);
    K.bloom(x, cx, cy, rad * 2.2, K.mix(P.sun, '#fff', 0.4), 0.4);
    // streamers
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, len = rad * (1.05 + r() * 1.8); x.strokeStyle = K.rgba(P.sun, 0.04 + r() * 0.08); x.lineWidth = 0.8 + r() * 2; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); x.stroke(); }
    x.restore();
    // dark disc with thin bright limb
    const g = x.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.02);
    g.addColorStop(0, K.mix(P.ink, '#000', 0.3)); g.addColorStop(0.9, K.mix(P.ink, '#000', 0.3)); g.addColorStop(0.97, K.rgba(P.sun, 0.7)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad * 1.02, 0, Math.PI * 2); x.fill();
  }

  /* ── the broken, painterly horizon glow that REPLACES the synthwave stripes ── */
  function brokenGlow(x, P, W, H, hY, sunX, sunR, r, noise) {
    x.save(); x.globalCompositeOperation = 'lighter';
    // irregular wedge of light reaching down from the horizon under the sun,
    // textured by fbm so it's broken & shimmering, never a regular stripe ladder
    const top = hY, bottom = H;
    const cols = 64;
    for (let i = 0; i < cols; i++) {
      const fx = sunX + (i / cols - 0.5) * sunR * 3.4;
      for (let yy = top; yy < bottom; yy += 5) {
        const t = (yy - top) / (bottom - top);
        const spread = sunR * (0.5 + t * 2.2);
        const dx = Math.abs(fx - sunX);
        if (dx > spread) continue;
        const fall = 1 - dx / spread;
        const n = (noise.fbm(fx / 80, yy / 36 + 3, 4) + 1) / 2;
        const a = 0.13 * fall * (1 - t * 0.85) * n * n;
        if (a < 0.01) continue;
        x.fillStyle = K.rgba(K.mix(P.sun, P.sky2, t * 0.55), a);
        x.fillRect(fx + (r() - 0.5) * 6, yy, 7, 5);
      }
    }
    x.restore();
  }

  /* ── horizon silhouette + tiny structures/landforms for scale ── */
  function horizonLine(x, P, W, H, hY, kind, r, noise) {
    // graded murk below the horizon: lit at the line, deepening into ink.
    // keep some colour/light in the foreground so it never crushes to flat black.
    const gg = x.createLinearGradient(0, hY - 30, 0, H);
    gg.addColorStop(0, K.rgba(K.mix(P.ink, P.sky2, 0.5), 1));
    gg.addColorStop(0.35, K.mix(P.ink, P.sky2, 0.22));
    gg.addColorStop(0.7, K.mix(P.ink, P.haze, 0.12));
    gg.addColorStop(1, K.mix(P.ink, '#000', 0.25));
    x.fillStyle = gg; x.fillRect(0, hY - 30, W, H - hY + 30);
    // faint mottled texture in the foreground murk (atmosphere, not flat fill)
    K.mottle(x, 0, hY, W, H - hY, P.sky2, 2200, r, 'screen');
    // soft haze hugging the horizon line
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, hY - H * 0.08, 0, hY + H * 0.04);
    hb.addColorStop(0, 'rgba(0,0,0,0)'); hb.addColorStop(0.6, K.rgba(P.haze, 0.18)); hb.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hb; x.fillRect(0, hY - H * 0.08, W, H * 0.12); x.restore();

    x.save();
    const inkSil = K.mix(P.ink, '#000', 0.25);
    if (kind === 'Reef') {
      // strange stacked landform / mesa-islands floating in murk
      x.fillStyle = inkSil; x.beginPath(); x.moveTo(0, hY);
      let xx = 0;
      while (xx < W) {
        const w = W * (0.05 + r() * 0.14), h = 8 + r() * 46;
        x.lineTo(xx, hY - h);
        for (let k = 0; k <= w; k += 10) x.lineTo(xx + k, hY - h - Math.sin(k / w * Math.PI) * (4 + r() * 16));
        x.lineTo(xx + w, hY);
        xx += w + r() * 30;
      }
      x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
    } else if (kind === 'Mesa') {
      x.fillStyle = inkSil; x.beginPath(); x.moveTo(0, hY);
      let xx = 0; while (xx < W) { const w = W * (0.08 + r() * 0.2), h = (8 + r() * 64); x.lineTo(xx, hY - h); x.lineTo(xx + w, hY - h); xx += w; }
      x.lineTo(W, hY); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
    } else if (kind === 'Dunes') {
      x.fillStyle = inkSil; x.beginPath(); x.moveTo(0, hY);
      for (let xx = 0; xx <= W; xx += 8) { const yy = hY - Math.sin(xx / W * Math.PI * (1 + r() * 2)) * 24 - noise.fbm(xx / 130, 5, 2) * 24; x.lineTo(xx, yy); }
      x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
    } else {
      // Skyline / Spires — tiny structures for scale (kept small & sparse)
      x.fillStyle = inkSil; x.beginPath(); x.moveTo(0, hY);
      let xx = 0;
      while (xx < W) {
        const w = kind === 'Spires' ? (3 + r() * 12) : (7 + r() * 30);
        const h = kind === 'Spires' ? (16 + r() * 130) * (r() < 0.25 ? 1.5 : 1) : (5 + r() * 52) * (r() < 0.18 ? 1.7 : 1);
        x.lineTo(xx, hY - h); x.lineTo(xx + w, hY - h);
        if (kind === 'Spires' && h > 90) { x.lineTo(xx + w / 2, hY - h - 16); x.lineTo(xx + w, hY - h); }
        xx += w + (kind === 'Spires' ? r() * 9 : r() * 5);
      }
      x.lineTo(W, hY); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
      // a few faint lit windows / beacons
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 50; i++) { const lwx = r() * W, lwy = hY - r() * 70; if (lwy < hY - 4) { x.fillStyle = K.rgba(K.mix(P.sun, P.body, r()), 0.35 + r() * 0.35); x.fillRect(lwx, lwy, 1.6, 1.6); } }
    }
    x.restore();
  }

  function motes(x, P, W, H, hY, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 150; i++) { const mx = r() * W, my = r() * (hY * 0.98); const s = r() * 1.7 + 0.3; x.fillStyle = K.rgba(r() < 0.3 ? P.sun : P.haze, 0.08 + r() * 0.32); x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill(); }
    // distant flock of flecks for scale/life
    if (r() < 0.7) { const fx = W * (0.2 + r() * 0.5), fy = hY * (0.28 + r() * 0.4); for (let i = 0; i < K.rint(r, 10, 26); i++) { const bx = fx + (r() - 0.5) * W * 0.3, by = fy + (r() - 0.5) * hY * 0.18; x.strokeStyle = K.rgba(P.ink, 0.45); x.lineWidth = 1.3; x.beginPath(); x.moveTo(bx - 4, by); x.quadraticCurveTo(bx, by - 3, bx + 4, by); x.stroke(); } }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hY = H * (p.fmt.t === 'Portal' ? 0.72 : 0.64) + (r() - 0.5) * H * 0.07;

    skyGradient(x, P, W, H, hY);
    if (p.aurora) auroraVeil(x, P, W, H, hY, r, noise);
    volHaze(x, P, W, H, hY, noise, r);
    strata(x, P, W, hY, r, noise);

    // celestial bodies — secondaries first (deeper, hazier), dominant sun last.
    const sunR = W * (0.10 + r() * 0.085);
    const sunX = W * (0.22 + r() * 0.56), sunY = hY * (0.32 + r() * 0.42);

    // collect secondary placements, sorted by radius so big ones sit behind
    const secs = [];
    for (let i = 0; i < p.bodies; i++) {
      const br = sunR * (0.16 + r() * 0.55);
      const bx = r() * W, by = hY * (0.1 + r() * 0.72);
      const col = K.mix(P.body, i % 2 ? P.haze : P.sun, r() * 0.5);
      secs.push({ br, bx, by, col, rings: r() < 0.4, lit: r() < 0.55 });
    }
    secs.sort((a, b) => b.br - a.br);
    for (const s of secs) body(x, P, noise, s.bx, s.by, s.br, s.col, r, { isSun: false, rings: s.rings, lit: s.lit });

    // mid-haze pass to partially occlude/sink the secondaries into atmosphere
    K.hazeSheet(x, W, Math.floor(hY * 1.02), noise, K.mix(P.haze, P.sky2, 0.4), 0.07, 240, 'screen');

    if (p.phase === 'Eclipse' || p.event === 'Double Eclipse') eclipse(x, P, noise, sunX, sunY, sunR, r);
    else body(x, P, noise, sunX, sunY, sunR, P.sun, r, { isSun: true, rings: p.rings, lit: true });

    horizonLine(x, P, W, H, hY, p.horizon, r, noise);

    // broken painterly glow under the sun (replaces synthwave reflection stripes)
    if (p.horizon === 'Reef' || p.horizon === 'Dunes' || r() < 0.5) brokenGlow(x, P, W, H, hY, sunX, sunR, r, noise);

    motes(x, P, W, H, hY, r);

    // finishing atmosphere
    K.hazeSheet(x, W, H, noise, P.sky2, 0.045, 200, 'screen');
    // painterly dust flecks across the sky (random scatter, not a grid)
    x.save(); x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < Math.floor(W * hY / 1100); i++) {
      const dx = r() * W, dy = r() * hY, s = 0.6 + r() * 2.4;
      const c = r() < 0.5 ? K.mix(P.haze, '#fff', 0.4) : K.mix(P.haze, P.ink, 0.5);
      x.fillStyle = K.rgba(c, 0.03 + r() * 0.06);
      x.beginPath(); x.arc(dx, dy, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    K.grain(x, W, H, 520, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.32); x.restore();
    // top-down darkening for depth (gentle)
    const tg = x.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, K.rgba(K.mix(P.sky1, '#000', 0.4), 0.28)); tg.addColorStop(0.4, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 't_solaria', draw, traits };
})();
