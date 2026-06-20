/* DIRECTION A — ARCOLOGY
 * An epic cyberpunk megastructure: layered towers receding into volumetric fog,
 * window-grids glowing, holo-signage, hanging cables, beacon lights, a hazy
 * reactor glow on the horizon. Busy SCENE, deep parallax haze, saturated neon. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Custom cyberpunk-terminal colorways (NOT outrun). bg = void; glow = reactor
  // haze; win = window light pool; sign = holo-signage; accent = beacons.
  const PALS = [
    { name: 'Reactor',     bg: '#04070a', fog: '#0a3a2e', glow: '#39ff9e', win: '#7dffc8', sign: '#ffcf3d', accent: '#ff4d6d' },
    { name: 'Deep Cyber',  bg: '#04060f', fog: '#0b2a4a', glow: '#1fb6ff', win: '#7de8ff', sign: '#ff3df0', accent: '#ffd23d' },
    { name: 'Sodium',      bg: '#0a0703', fog: '#3a2208', glow: '#ff9a1f', win: '#ffd089', sign: '#34e0d0', accent: '#ff4d3d' },
    { name: 'Acid',        bg: '#060a04', fog: '#26400a', glow: '#b6ff1f', win: '#e6ff7d', sign: '#ff2dba', accent: '#1fd6ff' },
    { name: 'Phosphor',    bg: '#03080a', fog: '#0a3030', glow: '#27ffd6', win: '#b6fff0', sign: '#ff5d5d', accent: '#ffe23d' },
    { name: 'Ultraviolet', bg: '#070416', fog: '#2a0f55', glow: '#9b5dff', win: '#c79bff', sign: '#ff3d8a', accent: '#3df0ff' },
  ];
  const FMTS = [ { W: 1180, H: 1480, t: 'Tower' }, { W: 1480, H: 1180, t: 'Skyline' }, { W: 1280, H: 1280, t: 'Square' } ];
  const SKIES = ['Reactor Dawn', 'Smog', 'Eclipse'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      sky: K.pick(SKIES, r),
      layers: K.rint(r, 5, 7),
      density: K.pick(['Sprawl', 'Spire', 'Canyon'], r),
    };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Sky: p.sky, Layout: p.density }; }

  function tower(x, P, bx, by, bw, bh, depth, r) {
    // body
    const body = K.mix(P.bg, P.fog, 0.5 + depth * 0.4);
    x.fillStyle = body; x.fillRect(bx, by - bh, bw, bh);
    // silhouette edge light
    x.strokeStyle = K.rgba(P.glow, 0.10 + depth * 0.25); x.lineWidth = 1;
    x.strokeRect(bx + 0.5, by - bh + 0.5, bw, bh);
    // window grid — saturated lit cells, denser/brighter when nearer
    const cw = Math.max(3, bw / K.rint(r, 4, 9));
    const ch = Math.max(4, cw * (0.9 + r() * 0.8));
    const onP = 0.18 + depth * 0.45;
    for (let yy = by - bh + ch; yy < by - 2; yy += ch + 1) {
      for (let xx = bx + 2; xx < bx + bw - cw; xx += cw + 1) {
        if (r() > onP) continue;
        const lit = r() < 0.5 ? P.win : (r() < 0.5 ? P.sign : P.glow);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(lit, (0.35 + depth * 0.5) * (0.6 + r() * 0.4));
        x.fillRect(xx, yy, cw * 0.7, ch * 0.55);
        x.restore();
      }
    }
    // rooftop antenna + beacon on nearer towers
    if (depth > 0.45 && r() < 0.7) {
      const ax = bx + bw * (0.3 + r() * 0.4), ah = bh * (0.08 + r() * 0.18);
      x.strokeStyle = K.rgba(P.win, 0.5); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(ax, by - bh); x.lineTo(ax, by - bh - ah); x.stroke();
      K.bloom(x, ax, by - bh - ah, 6 + depth * 14, P.accent, 0.6);
    }
  }

  function sign(x, P, sx, sy, sw, sh, r) {
    // holo billboard: glowing panel + glyph/bar content
    x.save(); x.globalCompositeOperation = 'lighter';
    K.bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * 0.9, P.sign, 0.22);
    x.fillStyle = K.rgba(P.sign, 0.10); x.fillRect(sx, sy, sw, sh);
    x.strokeStyle = K.rgba(P.sign, 0.55); x.lineWidth = 1.4; x.strokeRect(sx, sy, sw, sh);
    const rows = K.rint(r, 2, 4);
    for (let i = 0; i < rows; i++) {
      const ry = sy + (i + 0.5) * (sh / rows);
      let cxp = sx + 4;
      while (cxp < sx + sw - 6) {
        const w = 3 + r() * (sw * 0.18);
        if (r() < 0.7) { x.fillStyle = K.rgba(r() < 0.5 ? P.win : P.sign, 0.5 + r() * 0.4); x.fillRect(cxp, ry - sh * 0.06, w, sh * 0.12); }
        cxp += w + 3 + r() * 5;
      }
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    // ground void → fog gradient sky
    const horizon = H * (0.62 + r() * 0.12);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.3));
    g.addColorStop(horizon / H - 0.12, P.bg);
    g.addColorStop(horizon / H, K.mix(P.fog, P.glow, p.sky === 'Eclipse' ? 0.08 : 0.22));
    g.addColorStop(1, K.mix(P.bg, P.fog, 0.5));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // reactor glow on the horizon (the hazy sun/core)
    if (p.sky !== 'Eclipse') K.bloom(x, W * (0.3 + r() * 0.4), horizon, W * (0.4 + r() * 0.25), P.glow, p.sky === 'Smog' ? 0.18 : 0.3);
    else { x.save(); x.globalCompositeOperation = 'lighter'; const eg = x.createRadialGradient(W*0.5,horizon,W*0.02,W*0.5,horizon,W*0.3); eg.addColorStop(0,K.rgba(P.accent,0.0));eg.addColorStop(0.5,K.rgba(P.accent,0.18));eg.addColorStop(1,K.rgba(P.accent,0)); x.fillStyle=eg; x.fillRect(0,0,W,H); x.restore(); }

    // layered towers back→front with fog between layers (parallax depth haze)
    const L = p.layers;
    for (let l = 0; l < L; l++) {
      const depth = l / (L - 1);
      const baseY = horizon + depth * (H - horizon) * 0.85;
      const maxH = (0.18 + depth * 0.6) * H;
      const wMul = p.density === 'Spire' ? 0.55 : p.density === 'Canyon' ? 1.4 : 1;
      let bx = -W * 0.05;
      while (bx < W * 1.02) {
        const bw = (W * (0.04 + r() * 0.09)) * (0.6 + depth * 0.9) * wMul;
        const bh = maxH * (0.35 + r() * 0.65) * (p.density === 'Spire' ? 1.25 : 1);
        tower(x, P, bx, baseY, bw, bh, depth, r);
        // occasional billboard strapped to a nearer tower
        if (depth > 0.4 && r() < 0.22) sign(x, P, bx + bw * 0.1, baseY - bh * (0.4 + r() * 0.4), bw * (0.7 + r()), bh * (0.12 + r() * 0.1), r);
        bx += bw * (1.02 + r() * 0.5);
      }
      // volumetric fog sheet over this layer (nearer = thinner)
      K.hazeSheet(x, W, H, noise, K.mix(P.fog, P.glow, 0.25), (1 - depth) * 0.5 + 0.12, 90 + l * 30, 'screen');
    }

    // foreground hanging cables
    x.save(); x.globalCompositeOperation = 'lighter';
    const cables = K.rint(r, 6, 12);
    for (let i = 0; i < cables; i++) {
      const x0 = r() * W, sag = 40 + r() * 160, x1 = x0 + (r() - 0.5) * W * 0.5;
      x.strokeStyle = K.rgba(r() < 0.5 ? P.bg : K.mix(P.bg, P.accent, 0.3), 0.6); x.lineWidth = 0.8 + r() * 1.6;
      x.beginPath(); x.moveTo(x0, 0); x.quadraticCurveTo((x0 + x1) / 2, sag, x1, H * (0.3 + r() * 0.4)); x.stroke();
      if (r() < 0.4) K.bloom(x, x1, H * (0.3 + r() * 0.4), 4 + r() * 8, P.accent, 0.5);
    }
    x.restore();

    // atmospheric drift + finish
    K.hazeSheet(x, W, H, noise, P.glow, 0.10, 220, 'screen');
    K.grain(x, W, H, 520, r);
    K.vignette(x, W, H, 0.46);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'A_arcology', draw, traits };
})();
