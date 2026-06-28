/* UNCONFORMITY — abstract geology, core samples made of WRONG matter.
 * Stacked sedimentary strata of varied thickness & material: rock, ash, clay,
 * mineral, oxide — interspersed with IMPOSSIBLE bands (TV static, woven thread,
 * liquid, halftone, fine text, gold leaf). An "unconformity" is a tilted/eroded
 * surface where strata are truncated — used as the surreal cut.
 * SURREAL = real-but-off: a believable core sample whose layers can't exist.
 * Hazy, deeply textured, earthy, Kiefer-serious.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Earthy geological palette world. Each palette = ground + ink + a STACK of
     band colours (cols), plus accent seams (gold/ember/copper). The wrong-matter
     bands borrow from these so even the impossible reads as part of the rock. */
  const PALS = [
    { name: 'Oxide',   ground: '#cfc4b0', ink: '#241c14',
      cols: ['#7c3b22', '#b06a3a', '#caa06a', '#9a8a6e', '#4d4036', '#2c241d', '#d8c8a8', '#86432a'],
      accent: '#e8b24a', accent2: '#9c5a2c' },
    { name: 'Mineral', ground: '#c3c8c4', ink: '#1c2622',
      cols: ['#3f5d57', '#6f8a7e', '#9aa68e', '#7c7a6c', '#414a48', '#27302e', '#b8bca6', '#52635c'],
      accent: '#cdb15a', accent2: '#7d8f6e' },
    { name: 'Desert',  ground: '#e3d6c0', ink: '#3a261a',
      cols: ['#b5663f', '#d49a6a', '#e6c79a', '#a98c6a', '#7a5440', '#caa882', '#8c5a3c', '#efe0c4'],
      accent: '#e9c87a', accent2: '#b07346' },
    { name: 'Ashfall', ground: '#bdbab6', ink: '#0e0d0c',
      cols: ['#2a2826', '#4a4744', '#6e6a66', '#8f8a84', '#b6b1aa', '#d8d3cc', '#1a1918', '#5c564f'],
      accent: '#d8623a', accent2: '#a39c92' },
    { name: 'Seabed',  ground: '#cdd2cf', ink: '#141d22',
      cols: ['#243845', '#365a63', '#577a76', '#7d8c7c', '#9ba390', '#535e5a', '#1a262c', '#c2c4b2'],
      accent: '#d9cfa6', accent2: '#4f7a72' },
    { name: 'Vein',    ground: '#b8b0a6', ink: '#0c0a09',
      cols: ['#211d1a', '#36302a', '#4c443c', '#2a2420', '#171412', '#403832', '#1d1916', '#52473d'],
      accent: '#e3b54a', accent2: '#b87333' },
  ];

  const MODES = ['Core', 'Cliff', 'Unconformity', 'Fold', 'Sample Set', 'Seam'];
  // Core favours portrait; cliff/unconformity favour landscape; others square-ish.
  const FORMATS = { P: [1040, 1320], S: [1180, 1180], L: [1340, 1000] };

  // material kinds: realistic + impossible(*)
  const MATERIALS = ['rock', 'ash', 'clay', 'sand', 'mineral', 'conglom', 'crossbed', 'laminae',
    'static*', 'thread*', 'liquid*', 'halftone*', 'text*', 'gold*'];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* ── per-band material renderers. Each fills [x0,y0,w,h] (already clipped). ── */

  // wobble a horizontal contact with fbm so it's never ruler-straight
  function contactPath(x, noise, x0, y0, w, amp, ph, step) {
    step = step || 6;
    x.moveTo(x0, y0);
    for (let xx = 0; xx <= w; xx += step) {
      const n = noise.fbm((x0 + xx) / 90, (y0 * 0.7 + ph) / 90, 4);
      x.lineTo(x0 + xx, y0 + n * amp);
    }
    x.lineTo(x0 + w, y0);
  }

  function fillBand(x, noise, x0, y0, w, h, base, topAmp, botAmp, ph) {
    x.beginPath();
    // top contact
    x.moveTo(x0, y0);
    for (let xx = 0; xx <= w; xx += 6) {
      const n = noise.fbm((x0 + xx) / 80, (y0 + ph) / 80, 4);
      x.lineTo(x0 + xx, y0 + n * topAmp);
    }
    // bottom contact (reverse)
    for (let xx = w; xx >= 0; xx -= 6) {
      const n = noise.fbm((x0 + xx) / 80, (y0 + h + ph) / 80, 4);
      x.lineTo(x0 + xx, y0 + h + n * botAmp);
    }
    x.closePath();
    x.fillStyle = base; x.fill();
  }

  // ── REALISTIC materials ──
  function matRock(x, x0, y0, w, h, base, r, noise) {
    // massive rock: gradient + heavy mottle + faint internal bedding + hairline
    // fractures so even a thick bed never reads as a flat fill.
    const g = x.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, K.mix(base, '#fff', 0.07)); g.addColorStop(1, K.mix(base, '#000', 0.12));
    x.fillStyle = g; x.fillRect(x0, y0, w, h);
    K.mottle(x, x0, y0, w, h, base, 26, r, 'overlay');
    K.mottle(x, x0, y0, w, h, base, 80, r, 'multiply');
    // faint internal bedding waves (cloudy fbm streaks)
    x.save();
    const streaks = 2 + (r() * 3 | 0);
    for (let i = 0; i < streaks; i++) {
      const sy = y0 + h * (0.15 + r() * 0.7);
      const c = r() < 0.5 ? K.mix(base, '#fff', 0.14) : K.mix(base, '#000', 0.16);
      x.strokeStyle = K.rgba(c, 0.18 + r() * 0.14); x.lineWidth = 1 + r() * 3;
      x.beginPath();
      for (let xx = 0; xx <= w; xx += 7) { const n = noise.fbm((x0 + xx) / 60, sy / 50, 3); x.lineTo(x0 + xx, sy + n * h * 0.18); }
      x.stroke();
    }
    // hairline fractures
    x.strokeStyle = K.rgba(K.mix(base, '#000', 0.45), 0.22); x.lineWidth = 0.7;
    for (let i = 0; i < 2 + (r() * 3 | 0); i++) {
      let cx = x0 + r() * w, cy = y0 + r() * h; x.beginPath(); x.moveTo(cx, cy);
      for (let s = 0; s < 3; s++) { cx += (r() - 0.5) * w * 0.3; cy += (r() - 0.5) * h * 0.5; x.lineTo(cx, cy); }
      x.stroke();
    }
    x.restore();
  }
  function matAsh(x, x0, y0, w, h, base, r) {
    // fine even powder; soft, low-contrast speckle
    K.mottle(x, x0, y0, w, h, base, 14, r, 'soft-light');
    const n = Math.floor(w * h / 60);
    for (let i = 0; i < n; i++) {
      const c = r() < 0.5 ? K.mix(base, '#fff', 0.25) : K.mix(base, '#000', 0.22);
      x.fillStyle = K.rgba(c, 0.05 + r() * 0.06);
      x.fillRect(x0 + r() * w, y0 + r() * h, 1, 1);
    }
  }
  function matClay(x, x0, y0, w, h, base, r, noise) {
    // smooth with desiccation cracks
    x.fillStyle = base; x.fillRect(x0, y0, w, h);
    K.mottle(x, x0, y0, w, h, base, 50, r, 'overlay');
    x.save(); x.strokeStyle = K.rgba(K.mix(base, '#000', 0.4), 0.3); x.lineWidth = 0.8;
    const cracks = 3 + (r() * 4 | 0);
    for (let i = 0; i < cracks; i++) {
      let cx = x0 + r() * w, cy = y0 + r() * h;
      x.beginPath(); x.moveTo(cx, cy);
      const segs = 3 + (r() * 4 | 0);
      for (let s = 0; s < segs; s++) { cx += (r() - 0.5) * w * 0.18; cy += (r() - 0.5) * h * 0.8; x.lineTo(cx, cy); }
      x.stroke();
    }
    x.restore();
  }
  function matSand(x, x0, y0, w, h, base, r) {
    // gritty granular
    K.mottle(x, x0, y0, w, h, base, 18, r, 'overlay');
    const n = Math.floor(w * h / 22);
    for (let i = 0; i < n; i++) {
      const c = r() < 0.5 ? K.mix(base, '#fff', 0.3) : K.mix(base, '#000', 0.25);
      x.fillStyle = K.rgba(c, 0.08 + r() * 0.1);
      x.fillRect(x0 + r() * w, y0 + r() * h, 0.8 + r() * 0.8, 0.8 + r() * 0.8);
    }
  }
  function matMineral(x, x0, y0, w, h, base, r, noise) {
    // crystalline: angular facets via short bright/dark strokes
    x.fillStyle = base; x.fillRect(x0, y0, w, h);
    x.save();
    const n = Math.floor(w * h / 700);
    for (let i = 0; i < n; i++) {
      const fx = x0 + r() * w, fy = y0 + r() * h, len = 4 + r() * 14, ang = r() * Math.PI;
      const c = r() < 0.5 ? K.mix(base, '#fff', 0.35) : K.mix(base, '#000', 0.3);
      x.strokeStyle = K.rgba(c, 0.18 + r() * 0.18); x.lineWidth = 0.7 + r();
      x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len); x.stroke();
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, base, 60, r, 'overlay');
  }
  function matConglom(x, x0, y0, w, h, base, r, pal) {
    // pebbly: matrix + embedded rounded clasts. Clasts are drawn from the
    // palette's OWN band colours so the bed reads earthy, never accidental-cool.
    x.fillStyle = K.mix(base, '#000', 0.18); x.fillRect(x0, y0, w, h);
    const pool = (pal && pal.cols) ? pal.cols : [base];
    const n = Math.floor(w * h / 700);
    for (let i = 0; i < n; i++) {
      const px = x0 + r() * w, py = y0 + r() * h, pr = 4 + r() * Math.min(h * 0.45, 18);
      const src = pool[(r() * pool.length) | 0];
      const tone = K.mix(src, '#000', r() * 0.28);
      x.fillStyle = tone;
      const rx = pr * (0.75 + r() * 0.5), rot = r() * Math.PI;
      x.beginPath(); x.ellipse(px, py, rx, pr, rot, 0, 7); x.fill();
      x.strokeStyle = K.rgba(K.mix(src, '#000', 0.55), 0.3); x.lineWidth = 0.7;
      x.beginPath(); x.ellipse(px, py, rx, pr, rot, 0, 7); x.stroke();
      // warm specular highlight (palette-warm, not pure white → never cools)
      x.fillStyle = K.rgba(K.mix(src, '#fff', 0.5), 0.16);
      x.beginPath(); x.ellipse(px - rx * 0.3, py - pr * 0.3, rx * 0.28, pr * 0.24, rot, 0, 7); x.fill();
    }
    K.mottle(x, x0, y0, w, h, base, 50, r, 'multiply');
  }
  function matCrossbed(x, x0, y0, w, h, base, r) {
    // diagonal striations (cross-bedding), set in opposing sweeps
    x.fillStyle = base; x.fillRect(x0, y0, w, h);
    x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
    const dir = r() < 0.5 ? 1 : -1;
    const lines = Math.floor(w / 5);
    for (let i = -h; i < w + h; i += 4 + r() * 3) {
      const c = r() < 0.5 ? K.mix(base, '#fff', 0.16) : K.mix(base, '#000', 0.2);
      x.strokeStyle = K.rgba(c, 0.22 + r() * 0.2); x.lineWidth = 0.8 + r() * 1.2;
      x.beginPath();
      x.moveTo(x0 + i, y0);
      x.lineTo(x0 + i + dir * h * (0.5 + r() * 0.4), y0 + h);
      x.stroke();
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, base, 70, r, 'overlay');
  }
  function matLaminae(x, x0, y0, w, h, base, r, noise) {
    // very thin alternating layers (varves)
    let yy = y0;
    while (yy < y0 + h) {
      const th = 1 + r() * 3;
      const c = r() < 0.5 ? K.mix(base, '#fff', 0.12 + r() * 0.12) : K.mix(base, '#000', 0.12 + r() * 0.14);
      x.fillStyle = c;
      x.beginPath();
      x.moveTo(x0, yy);
      for (let xx = 0; xx <= w; xx += 8) { const n = noise.fbm((x0 + xx) / 120, yy / 60, 3); x.lineTo(x0 + xx, yy + n * 2); }
      x.lineTo(x0 + w, yy + th);
      for (let xx = w; xx >= 0; xx -= 8) { const n = noise.fbm((x0 + xx) / 120, (yy + th) / 60, 3); x.lineTo(x0 + xx, yy + th + n * 2); }
      x.closePath(); x.fill();
      yy += th;
    }
  }

  // ── IMPOSSIBLE materials (the shock) ──
  function matStatic(x, x0, y0, w, h, base, r) {
    // TV static / snow noise
    x.fillStyle = K.mix(base, '#000', 0.5); x.fillRect(x0, y0, w, h);
    const px = 2;
    for (let yy = y0; yy < y0 + h; yy += px) {
      for (let xx = x0; xx < x0 + w; xx += px) {
        const v = r();
        const g = v < 0.5 ? Math.floor(r() * 70) : 150 + Math.floor(r() * 105);
        x.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',0.85)';
        x.fillRect(xx, yy, px, px);
      }
    }
    // faint horizontal roll bar
    const by = y0 + r() * h;
    x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(x0, by, w, h * 0.06);
  }
  function matThread(x, x0, y0, w, h, base, r) {
    // woven thread / textile weave
    const warp = K.mix(base, '#fff', 0.2), weft = K.mix(base, '#000', 0.25);
    x.fillStyle = K.mix(base, '#000', 0.1); x.fillRect(x0, y0, w, h);
    const cell = 5 + r() * 3;
    x.lineWidth = cell * 0.7;
    for (let yy = y0; yy < y0 + h; yy += cell) {
      x.strokeStyle = K.rgba(weft, 0.5);
      x.beginPath(); x.moveTo(x0, yy + cell / 2); x.lineTo(x0 + w, yy + cell / 2); x.stroke();
    }
    for (let xx = x0; xx < x0 + w; xx += cell) {
      // vertical warp interrupted (over/under weave illusion)
      for (let yy = y0; yy < y0 + h; yy += cell * 2) {
        x.strokeStyle = K.rgba(warp, 0.55);
        x.beginPath(); x.moveTo(xx + cell / 2, yy); x.lineTo(xx + cell / 2, yy + cell); x.stroke();
      }
    }
    K.mottle(x, x0, y0, w, h, base, 60, r, 'overlay');
  }
  function matLiquid(x, x0, y0, w, h, base, r, noise) {
    // glassy liquid: smooth gradient + meniscus highlight + reflections
    const top = K.mix(base, '#fff', 0.22), bot = K.mix(base, '#000', 0.35);
    const g = x.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, top); g.addColorStop(0.5, base); g.addColorStop(1, bot);
    x.fillStyle = g; x.fillRect(x0, y0, w, h);
    // surface meniscus
    x.fillStyle = K.rgba('#fff', 0.4); x.fillRect(x0, y0 + h * 0.06, w, 1.5);
    // wavy specular reflections
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const ry = y0 + (0.2 + r() * 0.7) * h;
      x.strokeStyle = K.rgba('#fff', 0.06 + r() * 0.1); x.lineWidth = 1 + r() * 4;
      x.beginPath();
      for (let xx = 0; xx <= w; xx += 6) { const n = noise.fbm((x0 + xx) / 50, ry / 30, 3); x.lineTo(x0 + xx, ry + n * h * 0.1); }
      x.stroke();
    }
    x.restore();
    // a slow caustic shimmer near top
    K.sheen(x, x0 + w * (0.3 + r() * 0.4), y0 + h * 0.25, h * 1.4, '#ffffff', 0.10);
  }
  function matHalftone(x, x0, y0, w, h, base, r) {
    // halftone dot screen, dot size varying by a gradient
    x.fillStyle = K.mix(base, '#fff', 0.4); x.fillRect(x0, y0, w, h);
    const dark = K.mix(base, '#000', 0.55);
    const grid = 6 + r() * 3;
    for (let yy = y0 + grid / 2; yy < y0 + h; yy += grid) {
      for (let xx = x0 + grid / 2; xx < x0 + w; xx += grid) {
        const t = (xx - x0) / w; // density ramp
        const rad = (grid * 0.55) * (0.2 + t * 0.8) * (0.7 + r() * 0.5);
        x.fillStyle = dark;
        x.beginPath(); x.arc(xx, yy, rad, 0, 7); x.fill();
      }
    }
  }
  function matText(x, x0, y0, w, h, base, r) {
    // fine printed text — rows of tiny illegible glyph-marks
    x.fillStyle = K.mix(base, '#fff', 0.32); x.fillRect(x0, y0, w, h);
    const ink = K.mix(base, '#000', 0.6);
    const lineH = 4 + r() * 3;
    for (let yy = y0 + lineH; yy < y0 + h - 1; yy += lineH) {
      let xx = x0 + 3 + r() * 6;
      const indent = r() < 0.15;
      if (indent) xx += w * (0.1 + r() * 0.2);
      const end = x0 + w * (0.7 + r() * 0.28);
      while (xx < end) {
        const wlen = 4 + r() * 18;
        x.fillStyle = K.rgba(ink, 0.55 + r() * 0.25);
        // a "word": short dashes
        let wx = xx;
        while (wx < xx + wlen && wx < end) { const dl = 1 + r() * 3; x.fillRect(wx, yy, dl, 1.1); wx += dl + 0.8; }
        xx += wlen + 3 + r() * 4;
      }
    }
  }
  function matGold(x, x0, y0, w, h, base, r, noise, accent) {
    // gold leaf — crinkled metallic sheen with leaf-edge cracks
    const g = x.createLinearGradient(x0, y0, x0 + w, y0 + h);
    const gd = K.mix(accent, '#5a3a0a', 0.4), gl = K.mix(accent, '#fff7d8', 0.5);
    g.addColorStop(0, gd); g.addColorStop(0.3, gl); g.addColorStop(0.5, accent);
    g.addColorStop(0.7, gl); g.addColorStop(1, gd);
    x.fillStyle = g; x.fillRect(x0, y0, w, h);
    // crinkle facets
    x.save();
    for (let i = 0; i < Math.floor(w * h / 500); i++) {
      const fx = x0 + r() * w, fy = y0 + r() * h, s = 3 + r() * 18;
      x.fillStyle = K.rgba(r() < 0.5 ? '#fff7d0' : '#6b4710', 0.10 + r() * 0.16);
      x.beginPath();
      x.moveTo(fx, fy); x.lineTo(fx + s, fy + r() * s); x.lineTo(fx + r() * s, fy + s); x.closePath(); x.fill();
    }
    // leaf-edge cracks
    x.strokeStyle = K.rgba('#3a2606', 0.4); x.lineWidth = 0.6;
    for (let i = 0; i < 4 + (r() * 4 | 0); i++) {
      let cx = x0 + r() * w, cy = y0; x.beginPath(); x.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) { cx += (r() - 0.5) * w * 0.15; cy += h / 4; x.lineTo(cx, cy); }
      x.stroke();
    }
    x.restore();
    K.sheen(x, x0 + w * 0.3, y0 + h * 0.3, Math.max(w, h) * 0.8, '#fff7d8', 0.12);
  }

  function paintMaterial(x, mat, x0, y0, w, h, base, r, noise, pal) {
    switch (mat) {
      case 'rock': return matRock(x, x0, y0, w, h, base, r, noise);
      case 'ash': return matAsh(x, x0, y0, w, h, base, r);
      case 'clay': return matClay(x, x0, y0, w, h, base, r, noise);
      case 'sand': return matSand(x, x0, y0, w, h, base, r);
      case 'mineral': return matMineral(x, x0, y0, w, h, base, r, noise);
      case 'conglom': return matConglom(x, x0, y0, w, h, base, r, pal);
      case 'crossbed': return matCrossbed(x, x0, y0, w, h, base, r);
      case 'laminae': return matLaminae(x, x0, y0, w, h, base, r, noise);
      case 'static*': return matStatic(x, x0, y0, w, h, base, r);
      case 'thread*': return matThread(x, x0, y0, w, h, base, r);
      case 'liquid*': return matLiquid(x, x0, y0, w, h, base, r, noise);
      case 'halftone*': return matHalftone(x, x0, y0, w, h, base, r);
      case 'text*': return matText(x, x0, y0, w, h, base, r);
      case 'gold*': return matGold(x, x0, y0, w, h, base, r, noise, pal.accent);
      default: return matRock(x, x0, y0, w, h, base, r, noise);
    }
  }

  /* Build a stack of band descriptors spanning [y0,y1]. wrongFrac controls how
     many impossible bands appear. Returns [{y, h, mat, base}]. */
  function buildStack(y0, y1, pal, r, opts) {
    opts = opts || {};
    const bands = [];
    const real = ['rock', 'ash', 'clay', 'sand', 'mineral', 'conglom', 'crossbed', 'laminae'];
    const wrong = ['static*', 'thread*', 'liquid*', 'halftone*', 'text*', 'gold*'];
    const wrongFrac = opts.wrongFrac == null ? 0.18 : opts.wrongFrac;
    const total = y1 - y0;
    let y = y0, colIdx = (r() * pal.cols.length) | 0;
    let usedWrong = 0;
    const maxWrong = opts.maxWrong == null ? 3 : opts.maxWrong;
    while (y < y1 - 4) {
      const remain = y1 - y;
      // thickness: mix of thin laminae and thick massive beds
      let th;
      const roll = r();
      if (roll < 0.25) th = total * (0.012 + r() * 0.02);      // thin
      else if (roll < 0.7) th = total * (0.04 + r() * 0.06);   // medium
      else th = total * (0.09 + r() * 0.10);                   // thick massive
      th = Math.min(th, remain);
      if (th < 5) { th = remain; }
      let mat;
      const wantWrong = r() < wrongFrac && usedWrong < maxWrong && th > total * 0.02 && (opts.allowWrong !== false);
      if (wantWrong) { mat = K.pick(wrong, r); usedWrong++; }
      else { mat = K.pick(real, r); }
      // base colour walks through the palette stack (gradational)
      colIdx = (colIdx + (r() < 0.6 ? 1 : (r() * pal.cols.length | 0))) % pal.cols.length;
      let base = pal.cols[colIdx];
      if (mat === 'gold*') base = pal.accent;
      bands.push({ y, h: th, mat, base });
      y += th;
    }
    // ensure at least one wrong band exists if requested
    if (opts.forceWrong && usedWrong === 0 && bands.length > 2) {
      const i = 1 + ((r() * (bands.length - 2)) | 0);
      bands[i].mat = K.pick(wrong, r);
      if (bands[i].mat === 'gold*') bands[i].base = pal.accent;
    }
    return bands;
  }

  /* paint a vertical stack of bands within [x0,w], clipped externally. */
  function paintStack(x, bands, x0, w, pal, r, noise, contactAmp) {
    for (const b of bands) {
      x.save();
      // clip to wobbled band shape for organic contacts
      x.beginPath();
      const tA = contactAmp, bA = contactAmp;
      x.moveTo(x0, b.y);
      for (let xx = 0; xx <= w; xx += 6) { const n = noise.fbm((x0 + xx) / 80, (b.y) / 80, 4); x.lineTo(x0 + xx, b.y + n * tA); }
      for (let xx = w; xx >= 0; xx -= 6) { const n = noise.fbm((x0 + xx) / 80, (b.y + b.h) / 80, 4); x.lineTo(x0 + xx, b.y + b.h + n * bA); }
      x.closePath(); x.clip();
      paintMaterial(x, b.mat, x0, b.y, w, b.h, b.base, r, noise, pal);
      x.restore();
      // contact line shadow (subtle dark seam between beds)
      x.save();
      x.strokeStyle = K.rgba(pal.ink, 0.18); x.lineWidth = 0.8;
      x.beginPath();
      for (let xx = 0; xx <= w; xx += 8) { const n = noise.fbm((x0 + xx) / 80, b.y / 80, 4); const px = x0 + xx, py = b.y + n * tA; xx === 0 ? x.moveTo(px, py) : x.lineTo(px, py); }
      x.stroke();
      x.restore();
    }
  }

  function drawDepthScale(x, sx, y0, y1, ink, r) {
    x.save();
    x.strokeStyle = K.rgba(ink, 0.5); x.fillStyle = K.rgba(ink, 0.5);
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(sx, y0); x.lineTo(sx, y1); x.stroke();
    const ticks = 10;
    for (let i = 0; i <= ticks; i++) {
      const ty = y0 + (y1 - y0) * i / ticks;
      const major = i % 2 === 0;
      x.beginPath(); x.moveTo(sx, ty); x.lineTo(sx - (major ? 10 : 5), ty); x.stroke();
      if (major) {
        // tiny tick-label marks
        x.fillRect(sx - 22, ty - 0.5, 8, 1);
      }
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 13);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);

    // format per mode
    let fmt;
    if (mode === 'Core' || mode === 'Seam') fmt = r() < 0.8 ? FORMATS.P : FORMATS.S;
    else if (mode === 'Cliff' || mode === 'Unconformity') fmt = r() < 0.75 ? FORMATS.L : FORMATS.S;
    else fmt = K.pick([FORMATS.S, FORMATS.L, FORMATS.P], r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    // ground / matrix backdrop
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(pal.ground, '#fff', 0.05));
    bg.addColorStop(1, K.mix(pal.ground, '#000', 0.12));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    K.mottle(x, 0, 0, W, H, pal.ground, 40, r, 'multiply');

    // ── COMPOSE per mode ──
    if (mode === 'Core') {
      // single vertical cylindrical core sample on neutral ground
      const cw = W * (0.30 + r() * 0.10);
      const cx0 = W * 0.5 - cw / 2 + (r() - 0.5) * W * 0.06;
      const y0 = H * 0.05, y1 = H * 0.95;
      // shadow under core
      K.softShadow(x, cx0 + cw / 2 + cw * 0.2, (y0 + y1) / 2, cw * 1.1, 0.4);
      const bands = buildStack(y0, y1, pal, r, { forceWrong: true, maxWrong: 3 });
      x.save();
      // rounded core clip
      const rad = cw * 0.12;
      x.beginPath();
      x.moveTo(cx0 + rad, y0); x.lineTo(cx0 + cw - rad, y0);
      x.arcTo(cx0 + cw, y0, cx0 + cw, y0 + rad, rad); x.lineTo(cx0 + cw, y1 - rad);
      x.arcTo(cx0 + cw, y1, cx0 + cw - rad, y1, rad); x.lineTo(cx0 + rad, y1);
      x.arcTo(cx0, y1, cx0, y1 - rad, rad); x.lineTo(cx0, y0 + rad);
      x.arcTo(cx0, y0, cx0 + rad, y0, rad); x.closePath(); x.clip();
      paintStack(x, bands, cx0, cw, pal, r, noise, 4);
      // cylindrical shade (darken edges, lighten center) for 3D round
      const cg = x.createLinearGradient(cx0, 0, cx0 + cw, 0);
      cg.addColorStop(0, 'rgba(0,0,0,0.42)'); cg.addColorStop(0.18, 'rgba(0,0,0,0.10)');
      cg.addColorStop(0.42, 'rgba(255,255,255,0.10)'); cg.addColorStop(0.6, 'rgba(255,255,255,0.02)');
      cg.addColorStop(0.85, 'rgba(0,0,0,0.20)'); cg.addColorStop(1, 'rgba(0,0,0,0.5)');
      x.fillStyle = cg; x.fillRect(cx0, y0, cw, y1 - y0);
      x.restore();
      // core outline
      x.strokeStyle = K.rgba(pal.ink, 0.4); x.lineWidth = 1.4;
      x.strokeRect(cx0, y0, cw, y1 - y0);
      // depth scale to the left
      drawDepthScale(x, cx0 - W * 0.05, y0, y1, pal.ink, r);

    } else if (mode === 'Cliff') {
      // wide eroded strata cliff filling the frame
      const y0 = -H * 0.05, y1 = H * 1.05;
      const bands = buildStack(y0, y1, pal, r, { wrongFrac: 0.16, maxWrong: 3 });
      paintStack(x, bands, -10, W + 20, pal, r, noise, 7);
      // erosion: a few vertical gullies (darker recessed cuts)
      x.save();
      const gullies = 2 + (r() * 3 | 0);
      for (let i = 0; i < gullies; i++) {
        const gx = W * (0.1 + r() * 0.8), gw = W * (0.02 + r() * 0.04);
        const gg = x.createLinearGradient(gx - gw, 0, gx + gw, 0);
        gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, 'rgba(0,0,0,0.28)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gg; x.fillRect(gx - gw, 0, gw * 2, H);
      }
      x.restore();

    } else if (mode === 'Unconformity') {
      // tilted lower strata truncated by flat upper strata — the surreal gap
      const cutY = H * (0.40 + r() * 0.22);
      const tilt = (r() < 0.5 ? -1 : 1) * (0.12 + r() * 0.16); // radians-ish slope
      // LOWER: tilted strata, clipped below an angled erosion surface
      x.save();
      x.beginPath();
      // angled top boundary of lower unit (the unconformity surface, wobbled)
      const lx = 0, rx = W;
      const lyTop = cutY - tilt * W * 0.5, ryTop = cutY + tilt * W * 0.5;
      x.moveTo(lx, lyTop);
      for (let xx = 0; xx <= W; xx += 8) { const n = noise.fbm(xx / 70, cutY / 70, 4); x.lineTo(xx, cutY + (xx / W - 0.5) * tilt * W + n * 8); }
      x.lineTo(W, H + 20); x.lineTo(0, H + 20); x.closePath(); x.clip();
      // build a stack rotated about center for the tilt
      const lower = buildStack(-H * 0.3, H * 1.3, pal, r, { wrongFrac: 0.14, maxWrong: 2 });
      x.translate(W / 2, cutY); x.rotate(Math.atan(tilt)); x.translate(-W / 2, -cutY);
      paintStack(x, lower, -W * 0.4, W * 1.8, pal, r, noise, 6);
      x.restore();
      // erosion seam highlight along unconformity
      x.save(); x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = 2.2;
      x.beginPath();
      for (let xx = 0; xx <= W; xx += 8) { const n = noise.fbm(xx / 70, cutY / 70, 4); const py = cutY + (xx / W - 0.5) * tilt * W + n * 8; xx === 0 ? x.moveTo(xx, py) : x.lineTo(xx, py); }
      x.stroke();
      // a thin pebble lag line (conglomerate marking the erosion)
      x.fillStyle = K.rgba(K.mix(pal.cols[4], '#000', 0.2), 0.6);
      for (let xx = 0; xx <= W; xx += 6 + r() * 8) { const n = noise.fbm(xx / 70, cutY / 70, 4); const py = cutY + (xx / W - 0.5) * tilt * W + n * 8; x.beginPath(); x.arc(xx, py - 1, 1 + r() * 2.5, 0, 7); x.fill(); }
      x.restore();
      // UPPER: flat strata above the cut
      x.save();
      x.beginPath();
      x.moveTo(0, -20); x.lineTo(W, -20);
      x.lineTo(W, cutY + (1 - 0.5) * tilt * W * 0 + 0);
      for (let xx = W; xx >= 0; xx -= 8) { const n = noise.fbm(xx / 70, cutY / 70, 4); x.lineTo(xx, cutY + (xx / W - 0.5) * tilt * W + n * 8); }
      x.closePath(); x.clip();
      const upper = buildStack(-H * 0.05, cutY + tilt * W * 0.5 + 10, pal, r, { wrongFrac: 0.18, maxWrong: 2, forceWrong: true });
      paintStack(x, upper, -10, W + 20, pal, r, noise, 5);
      x.restore();

    } else if (mode === 'Fold') {
      // buckled / folded strata — bands follow a sine warp
      const y0 = -H * 0.1, y1 = H * 1.1;
      const bands = buildStack(y0, y1, pal, r, { wrongFrac: 0.15, maxWrong: 3 });
      const amp = H * (0.05 + r() * 0.08), period = W * (0.5 + r() * 0.6), phase = r() * 7;
      const warp = (xx) => Math.sin((xx / period) * Math.PI * 2 + phase) * amp
        + Math.sin((xx / (period * 0.43)) * Math.PI * 2 + phase * 1.7) * amp * 0.4;
      for (const b of bands) {
        x.save();
        x.beginPath();
        x.moveTo(0, b.y + warp(0));
        for (let xx = 0; xx <= W; xx += 6) { const n = noise.fbm(xx / 80, b.y / 80, 4); x.lineTo(xx, b.y + warp(xx) + n * 4); }
        for (let xx = W; xx >= 0; xx -= 6) { const n = noise.fbm(xx / 80, (b.y + b.h) / 80, 4); x.lineTo(xx, b.y + b.h + warp(xx) + n * 4); }
        x.closePath(); x.clip();
        // paint material over a generous box following fold
        paintMaterial(x, b.mat, -10, b.y - amp - 10, W + 20, b.h + amp * 2 + 20, b.base, r, noise, pal);
        x.restore();
        // contact seam
        x.save(); x.strokeStyle = K.rgba(pal.ink, 0.16); x.lineWidth = 0.9; x.beginPath();
        for (let xx = 0; xx <= W; xx += 8) { const py = b.y + warp(xx); xx === 0 ? x.moveTo(xx, py) : x.lineTo(xx, py); }
        x.stroke(); x.restore();
      }

    } else if (mode === 'Sample Set') {
      // a row of 3–5 core segments side by side, each its own short stack
      const n = 3 + (r() * 3 | 0);
      const margin = W * 0.06, gap = W * 0.035;
      const totW = W - margin * 2 - gap * (n - 1);
      const segW = totW / n;
      const y0 = H * 0.08, y1 = H * 0.92;
      for (let i = 0; i < n; i++) {
        const sx = margin + i * (segW + gap);
        // slight vertical offset per segment (different depths)
        const off = (r() - 0.5) * H * 0.05;
        const sy0 = y0 + off, sy1 = y1 + off;
        K.softShadow(x, sx + segW / 2 + segW * 0.15, (sy0 + sy1) / 2, segW * 1.0, 0.35);
        const bands = buildStack(sy0, sy1, pal, r, { wrongFrac: 0.16, maxWrong: 2, forceWrong: i === (n >> 1) });
        x.save();
        x.beginPath(); x.rect(sx, sy0, segW, sy1 - sy0); x.clip();
        paintStack(x, bands, sx, segW, pal, r, noise, 3);
        // cylindrical shade
        const cg = x.createLinearGradient(sx, 0, sx + segW, 0);
        cg.addColorStop(0, 'rgba(0,0,0,0.4)'); cg.addColorStop(0.4, 'rgba(255,255,255,0.08)');
        cg.addColorStop(0.6, 'rgba(255,255,255,0.02)'); cg.addColorStop(1, 'rgba(0,0,0,0.45)');
        x.fillStyle = cg; x.fillRect(sx, sy0, segW, sy1 - sy0);
        x.restore();
        x.strokeStyle = K.rgba(pal.ink, 0.35); x.lineWidth = 1.2; x.strokeRect(sx, sy0, segW, sy1 - sy0);
        // tiny label tick under each
        x.fillStyle = K.rgba(pal.ink, 0.4); x.fillRect(sx, sy1 + H * 0.012, segW * (0.3 + r() * 0.4), 2);
      }

    } else { // Seam — mostly dark rock with one anomalous glowing/wrong seam
      const y0 = -H * 0.05, y1 = H * 1.05;
      // dark rock dominated stack
      const bands = buildStack(y0, y1, pal, r, { allowWrong: false });
      // force deep darkness so the single anomaly truly pops
      for (const b of bands) { b.base = K.mix(b.base, '#0a0807', 0.55 + r() * 0.25); }
      paintStack(x, bands, -10, W + 20, pal, r, noise, 6);
      // the single anomalous seam: a glowing/wrong band, thick enough to read
      const sy = H * (0.32 + r() * 0.34), sh = H * (0.05 + r() * 0.06);
      const wrongMats = ['static*', 'liquid*', 'gold*', 'text*', 'halftone*'];
      const sm = K.pick(wrongMats, r);
      x.save();
      x.beginPath();
      x.moveTo(0, sy);
      for (let xx = 0; xx <= W; xx += 6) { const n = noise.fbm(xx / 70, sy / 70, 4); x.lineTo(xx, sy + n * 6); }
      for (let xx = W; xx >= 0; xx -= 6) { const n = noise.fbm(xx / 70, (sy + sh) / 70, 4); x.lineTo(xx, sy + sh + n * 6); }
      x.closePath(); x.clip();
      paintMaterial(x, sm, -10, sy, W + 20, sh, sm === 'gold*' ? pal.accent : K.mix(pal.accent, pal.cols[2], 0.3), r, noise, pal);
      x.restore();
      // glow halo around the seam — stronger, bleeds into the dark host rock
      x.save(); x.globalCompositeOperation = 'lighter';
      const glowCol = sm === 'gold*' ? pal.accent : K.mix(pal.accent, '#fff', 0.15);
      const gg = x.createLinearGradient(0, sy - sh * 3, 0, sy + sh * 4);
      gg.addColorStop(0, K.rgba(glowCol, 0)); gg.addColorStop(0.5, K.rgba(glowCol, 0.34)); gg.addColorStop(1, K.rgba(glowCol, 0));
      x.fillStyle = gg; x.fillRect(0, sy - sh * 3, W, sh * 7);
      // a tight core glow right on the seam
      const gc = x.createLinearGradient(0, sy, 0, sy + sh);
      gc.addColorStop(0, K.rgba(glowCol, 0.0)); gc.addColorStop(0.5, K.rgba(glowCol, 0.25)); gc.addColorStop(1, K.rgba(glowCol, 0.0));
      x.fillStyle = gc; x.fillRect(0, sy, W, sh);
      x.restore();
      // seam edge lines
      x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = 1.2;
      x.beginPath(); for (let xx = 0; xx <= W; xx += 8) { const n = noise.fbm(xx / 70, sy / 70, 4); xx === 0 ? x.moveTo(xx, sy + n * 6) : x.lineTo(xx, sy + n * 6); } x.stroke();
    }

    // ── ATMOSPHERE & TEXTURE (signature hazy/earthy grade) ──
    // warm dust haze: a low-frequency multiply of the palette's own earth tone,
    // plus a faint warm screen lift. Both palette-locked → no cool colour casts.
    const dustWarm = K.mix(pal.ground, pal.accent2 || pal.ink, 0.22);
    const dustDark = K.mix(pal.ground, pal.ink, 0.35);
    K.hazeSheet(x, W, H, noise, dustDark, 0.18, Math.min(W, H) * 0.95, 'multiply');
    K.hazeSheet(x, W, H, noise, dustWarm, 0.12, Math.min(W, H) * 0.45, 'overlay');
    // overall warm wash to unify the bands as one core (kills cool-contrast read)
    x.save(); x.globalCompositeOperation = 'soft-light';
    x.fillStyle = K.rgba(K.mix(pal.ground, pal.accent2 || '#7a5230', 0.35), 0.12);
    x.fillRect(0, 0, W, H); x.restore();
    K.grain(x, W, H, 4.2, r);
    K.vignette(x, W, H, pal.name === 'Vein' || pal.name === 'Ashfall' ? 0.44 : 0.36);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    let fmt;
    if (mode === 'Core' || mode === 'Seam') fmt = r() < 0.8 ? 'Portrait' : 'Square';
    else if (mode === 'Cliff' || mode === 'Unconformity') fmt = r() < 0.75 ? 'Landscape' : 'Square';
    else fmt = K.pick(['Square', 'Landscape', 'Portrait'], r);
    return { Palette: pal.name, Mode: mode, Format: fmt };
  }

  return { name: 's10_strata', draw, traits };
})();
