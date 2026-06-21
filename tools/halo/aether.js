/* AETHER — VOLUMETRIC MIST / PSEUDO-3D DEPTH FIELD
 * Pure abstract. Layered translucent strata and luminous geometric motes recede
 * into coloured haze, pierced by soft volumetric god-rays. A ray-marched fog
 * volume / impossible luminous architecture DISSOLVING into atmosphere — never a
 * building, never a scene. Real depth via many parallax layers: each further
 * layer is smaller, softer, and washed toward the fog colour, with additive
 * bloom cores supplying premium specular SHEEN. Several modes per seed for
 * variety: Rays / Strata / Mote Swarm / Aperture. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Palettes — mostly BRIGHT / SATURATED fog grounds (CEO loves colour, no dark
     bg needed). `fog` is the atmospheric ground colour that far layers wash to;
     `lo`/`mid`/`hi` build the depth ramp; `spec` is the bright sheen core. */
  const PALS = [
    { name: 'Cyan Drift',    fog: '#0fb6c9', lo: '#0a7d9a', mid: '#4fe3f0', hi: '#bafcff', spec: '#ffffff', accent: '#ff5ec4' },
    { name: 'Magenta Bloom', fog: '#d23bb0', lo: '#8e1f86', mid: '#ff6fdf', hi: '#ffc8f5', spec: '#fff0ff', accent: '#5ef0ff' },
    { name: 'Amber Veil',    fog: '#e8932a', lo: '#a85a12', mid: '#ffc24f', hi: '#fff0c6', spec: '#fffbe8', accent: '#5ad7ff' },
    { name: 'Viridian Haze', fog: '#1fae7a', lo: '#0d6b4d', mid: '#56f0b0', hi: '#ccffe8', spec: '#f2fffa', accent: '#ff7ad0' },
    { name: 'Coral Mist',    fog: '#f0644f', lo: '#aa3326', mid: '#ff977f', hi: '#ffd8cc', spec: '#fff2ec', accent: '#54e0ff' },
    { name: 'Electric Blue', fog: '#2f6bff', lo: '#163e9e', mid: '#6ea0ff', hi: '#cfe0ff', spec: '#f4f8ff', accent: '#ff8a3d' },
    { name: 'Violet Aurora',  fog: '#7a4ff0', lo: '#46249e', mid: '#b48cff', hi: '#e6d8ff', spec: '#f7f2ff', accent: '#4ff0c8' },
    { name: 'Obsidian Glow', fog: '#0c1024', lo: '#161e44', mid: '#3a5bd0', hi: '#9fc4ff', spec: '#eaf2ff', accent: '#ff5ec4' },
    { name: 'Deep Ember',    fog: '#160a14', lo: '#3a1430', mid: '#c23c7e', hi: '#ffb07a', spec: '#ffe6cc', accent: '#4fe3f0' },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  const MODES = ['Rays', 'Strata', 'Mote Swarm', 'Aperture'];

  function pickPal(r) {
    if (typeof window !== 'undefined' && window.FORCE_PAL) {
      const f = PALS.find((p) => p.name === window.FORCE_PAL);
      if (f) return f;
    }
    return K.pick(PALS, r);
  }

  function params(r) {
    const pal = pickPal(r);
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODES, r);
    const layers = K.rint(r, 7, 11);          // parallax depth count
    const motes = K.rint(r, 70, 150);
    const rays = K.rint(r, 5, 11);
    const tilt = (r() - 0.5) * 0.5;           // slight horizon/vanish tilt
    const vanish = { x: 0.28 + r() * 0.44, y: 0.30 + r() * 0.40 };
    const iri = r() < 0.55;                    // iridescent sheen flourish on cores
    const grain = 0.7 + r() * 0.6;
    return { pal, fmt, mode, layers, motes, rays, tilt, vanish, iri, grain };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Mode: p.mode,
      Format: p.fmt.t,
      Depth: p.layers >= 10 ? 'Cavernous' : p.layers >= 8 ? 'Deep' : 'Layered',
      Sheen: p.iri ? 'Iridescent' : 'Specular',
    };
  }

  /* depth t in [0,1]: 0 = nearest (sharp, big, saturated), 1 = far (small, soft,
     washed to fog). Returns the colour at that depth from a base. */
  function depthCol(base, fog, t) { return K.mix(base, fog, K.clamp(t * 0.85, 0, 1)); }

  /* A translucent strata sheet: a soft wavy band drifting across the volume,
     fading edges, additive so layers stack into luminous fog. */
  function stratum(x, W, H, noise, y, thick, col, alpha, warp, blend) {
    x.save(); x.globalCompositeOperation = blend || 'screen';
    x.beginPath();
    const top = [];
    for (let i = 0; i <= W; i += 8) {
      const n = noise.fbm(i / warp, y / 90, 4) * thick * 0.6;
      top.push([i, y + n]);
    }
    x.moveTo(0, top[0][1]);
    for (const [px, py] of top) x.lineTo(px, py);
    for (let i = top.length - 1; i >= 0; i--) x.lineTo(top[i][0], top[i][1] + thick);
    x.closePath();
    const g = x.createLinearGradient(0, y - thick * 0.2, 0, y + thick * 1.2);
    g.addColorStop(0, K.rgba(col, 0));
    g.addColorStop(0.5, K.rgba(col, alpha));
    g.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = g; x.fill();
    x.restore();
  }

  /* A luminous geometric mote: tiny crisp shape with a bright bloom core — the
     "luminous geometric motes" of the brief. Kept abstract (squares/diamonds/
     rings). Sharper + brighter when near, dimmer + smaller when far. */
  function mote(x, cx, cy, size, t, col, spec, kind, iri, phase) {
    const a = K.clamp(1 - t * 0.85, 0.06, 1);
    // bloom halo first (depth glow)
    K.bloom(x, cx, cy, size * (3.2 - t * 1.5), iri ? K.iridescent(phase, 0.8, 0.6) : col, 0.28 * a);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.translate(cx, cy);
    const edge = K.rgba(K.mix(col, spec, 0.5 + (1 - t) * 0.4), a * 0.9);
    x.strokeStyle = edge; x.lineWidth = K.clamp((1 - t) * 2.2 + 0.4, 0.4, 3);
    x.fillStyle = K.rgba(col, a * 0.22);
    const s = size;
    if (kind === 0) { // diamond
      x.beginPath(); x.moveTo(0, -s); x.lineTo(s, 0); x.lineTo(0, s); x.lineTo(-s, 0); x.closePath(); x.fill(); x.stroke();
    } else if (kind === 1) { // square (rotated slightly)
      x.rotate(phase * 0.6); x.beginPath(); x.rect(-s, -s, s * 2, s * 2); x.fill(); x.stroke();
    } else { // ring
      x.beginPath(); x.arc(0, 0, s, 0, Math.PI * 2); x.stroke();
    }
    x.restore();
    // bright specular core (the SHEEN)
    K.sheen(x, cx, cy, size * (1.4 - t * 0.6), spec, 0.5 * a);
  }

  /* Soft volumetric god-ray from a vanish point: a long bright wedge that fades. */
  function godray(x, W, H, vx, vy, ang, spread, len, col, alpha) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const x1 = vx + Math.cos(ang - spread) * len, y1 = vy + Math.sin(ang - spread) * len;
    const x2 = vx + Math.cos(ang + spread) * len, y2 = vy + Math.sin(ang + spread) * len;
    x.beginPath(); x.moveTo(vx, vy); x.lineTo(x1, y1); x.lineTo(x2, y2); x.closePath();
    const mx = vx + Math.cos(ang) * len, my = vy + Math.sin(ang) * len;
    const g = x.createLinearGradient(vx, vy, mx, my);
    g.addColorStop(0, K.rgba(col, alpha));
    g.addColorStop(0.4, K.rgba(col, alpha * 0.4));
    g.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = g; x.fill();
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const vx = W * p.vanish.x, vy = H * p.vanish.y;

    /* ── Atmospheric ground: a radial fog volume glowing from the vanish point.
         Bright/saturated ground per CEO. ── */
    const base = x.createRadialGradient(vx, vy, 0, vx, vy, Math.max(W, H) * 1.05);
    base.addColorStop(0, K.mix(P.fog, P.hi, 0.55));
    base.addColorStop(0.32, K.mix(P.fog, P.mid, 0.35));
    base.addColorStop(0.7, P.fog);
    base.addColorStop(1, K.mix(P.fog, '#05060a', 0.45));
    x.fillStyle = base; x.fillRect(0, 0, W, H);

    // deep haze body
    K.hazeSheet(x, W, H, noise, K.mix(P.fog, P.mid, 0.3), 0.5, 220, 'screen');

    /* ── Far → near build for true depth ordering ── */

    // 1) GOD-RAYS (drawn early so they sit deep in the volume, behind near motes)
    if (p.mode === 'Rays' || (p.mode !== 'Aperture' && r() < 0.7)) {
      const baseAng = Math.atan2(H * 0.5 - vy, W * 0.5 - vx) + p.tilt;
      for (let i = 0; i < p.rays; i++) {
        const ang = baseAng + (i / p.rays - 0.5) * (p.mode === 'Rays' ? 1.7 : 0.9) + K.randn(r) * 0.12;
        const spread = 0.015 + r() * 0.04;
        const len = Math.max(W, H) * (0.9 + r() * 0.5);
        const col = r() < 0.35 ? P.hi : K.mix(P.hi, P.mid, r());
        godray(x, W, H, vx, vy, ang, spread, len, col, 0.05 + r() * 0.07);
      }
    }

    // 2) APERTURE — concentric receding luminous rings into the vanish (portal)
    if (p.mode === 'Aperture') {
      const rings = K.rint(r, 14, 22);
      for (let i = rings; i >= 1; i--) {
        const t = i / rings;                  // far = large outer, near = inner bright
        const rad = Math.max(W, H) * (0.08 + t * 0.62);
        const col = depthCol(P.mid, P.fog, t);
        x.save(); x.globalCompositeOperation = 'screen';
        x.strokeStyle = K.rgba(col, 0.10 + (1 - t) * 0.22);
        x.lineWidth = 2 + (1 - t) * 10;
        x.beginPath();
        // gently warped ellipse for organic, non-mechanical feel
        const pts = 64;
        for (let k = 0; k <= pts; k++) {
          const a = (k / pts) * Math.PI * 2;
          const wob = 1 + noise.fbm(Math.cos(a) * 2 + i, Math.sin(a) * 2, 3) * 0.10;
          const px = vx + Math.cos(a) * rad * wob;
          const py = vy + Math.sin(a) * rad * wob * 0.82;
          k === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.stroke(); x.restore();
      }
      // bright core
      K.bloom(x, vx, vy, Math.max(W, H) * 0.22, P.hi, 0.5);
      K.sheen(x, vx, vy, Math.max(W, H) * 0.12, P.spec, 0.7);
    }

    // 3) STRATA — translucent layered sheets receding (always present, weighted)
    const sheetN = p.mode === 'Strata' ? K.rint(r, 14, 22) : K.rint(r, 7, 12);
    for (let i = sheetN; i >= 1; i--) {
      const t = i / sheetN;                    // far → near
      const y = H * (0.08 + (1 - t) * 0.84) + K.randn(r) * H * 0.04;
      const thick = H * (0.03 + (1 - t) * 0.10);
      const col = depthCol(r() < 0.4 ? P.mid : P.lo, P.fog, t);
      const alpha = 0.06 + (1 - t) * 0.14;
      stratum(x, W, H, noise, y, thick, col, alpha, 140 + r() * 160, 'screen');
    }

    // 4) MOTES — luminous geometric swarm with parallax depth
    const moteN = p.mode === 'Mote Swarm' ? Math.round(p.motes * 1.6) : p.motes;
    // build with depth, sort far→near so near ones overlay
    const arr = [];
    for (let i = 0; i < moteN; i++) {
      const t = Math.pow(r(), 0.7);            // bias toward more far motes
      // cluster around vanish for receding-into-depth feel
      const ang = r() * Math.PI * 2;
      const spread = (0.05 + t * 0.7) * Math.max(W, H);
      const cx = vx + Math.cos(ang) * spread * (0.5 + r() * 0.9) + K.randn(r) * W * 0.06;
      const cy = vy + Math.sin(ang) * spread * (0.5 + r() * 0.7) + K.randn(r) * H * 0.06;
      const size = (1 - t) * (3 + r() * 16) + 1.2;
      arr.push({ t, cx, cy, size, kind: K.rint(r, 0, 2), phase: r() });
    }
    arr.sort((a, b) => b.t - a.t);
    for (const m of arr) {
      const col = depthCol(P.mid, P.fog, m.t);
      mote(x, m.cx, m.cy, m.size, m.t, col, P.spec, m.kind, p.iri, m.phase);
    }

    // 5) a few HERO near motes — big crisp luminous forms for focal interest
    const heroes = K.rint(r, 2, 4);
    for (let i = 0; i < heroes; i++) {
      const hx = vx + (r() - 0.5) * W * 0.7;
      const hy = vy + (r() - 0.5) * H * 0.6;
      const size = 14 + r() * 30;
      mote(x, hx, hy, size, 0.04, P.hi, P.spec, K.rint(r, 0, 2), p.iri, r());
    }

    // accent sparks for colour pop
    const sparks = K.rint(r, 6, 14);
    for (let i = 0; i < sparks; i++) {
      K.sheen(x, r() * W, r() * H, 6 + r() * 16, P.accent, 0.25 + r() * 0.2);
    }

    /* ── Atmospheric finish ── */
    // near volumetric haze veil (sits in front, unifies the depth into one fog)
    K.hazeSheet(x, W, H, noise, K.mix(P.fog, P.hi, 0.2), 0.22, 130, 'screen');
    K.hazeSheet(x, W, H, noise, P.fog, 0.16, 300, 'multiply');

    // soft central sheen sweep — the headline glossy flourish
    K.sheen(x, vx, vy, Math.max(W, H) * 0.55, K.mix(P.spec, P.mid, 0.3), 0.10);
    if (p.iri) K.bloom(x, vx, vy, Math.max(W, H) * 0.4, K.iridescent(0.15 + r() * 0.6, 0.7, 0.62), 0.07);

    K.mottle(x, 0, 0, W, H, P.mid, 1400, r, 'overlay');
    K.grain(x, W, H, 420 / p.grain, r);
    K.vignette(x, W, H, lum(P.fog) > 0.4 ? 0.34 : 0.5);
    return { aspect: W / H };
  }

  function lum(h) { return K.lum(h); }

  return { name: 'aether', draw, traits };
})();
