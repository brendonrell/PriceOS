/* GARDEN OF GIANTS — a field of colossal bloom-machines under a strange sky.
 * An open valley teeming with GIANT semi-abstract flower-forms at architectural
 * scale: vast petalled heads, seed-orbs, bulb-towers, fronds the size of
 * buildings — some fused with subtle machine geometry (rings, pylon-stems,
 * gear-cores) — receding in scale across the field into haze. Pollen/light
 * motes drift. Tiny scale-markers below for the "skyscraper-tall flower" read.
 * "Real but off": flowers as tall as towers, too still, faintly mechanical.
 * Territory = HOT FLORA: magenta/pink/coral/fuchsia bloom-heads against deep
 * emerald/forest foliage & stems, gold/amber bloom-cores. Reads "hot pink
 * giant flowers on deep green" from afar. NOT trippy, NOT cyberpunk. */
window.ENGINE = (function () {
  const K = window.KIT;

  // sky1=zenith, sky2=low sky / haze glow, bloom=primary petal hue,
  // bloom2=accent petal hue, core=hot bloom-core, green=foliage/stem,
  // greenDeep=deep shadow foliage, ink=silhouette & deep murk.
  const PALS = [
    { name: 'Hot Magenta',   sky1:'#2a1030', sky2:'#7a2a5e', bloom:'#ff2d8e', bloom2:'#ff5fae', core:'#ffd24a', green:'#0f5a3e', greenDeep:'#06301f', ink:'#0a0710' },
    { name: 'Coral Field',   sky1:'#2d1428', sky2:'#8a3a52', bloom:'#ff5a5f', bloom2:'#ff8a6a', core:'#ffd06a', green:'#125a44', greenDeep:'#07301f', ink:'#0c0810' },
    { name: 'Fuchsia Valley',sky1:'#240e34', sky2:'#6e2868', bloom:'#e832a6', bloom2:'#ff63c4', core:'#ffcf5e', green:'#0d5238', greenDeep:'#052a1c', ink:'#08060f' },
    { name: 'Violet Bloom',  sky1:'#1e0f3a', sky2:'#5a2a78', bloom:'#c844e6', bloom2:'#ff6cd0', core:'#ffd87a', green:'#114c3c', greenDeep:'#06281e', ink:'#070612' },
    { name: 'Rose Ember',    sky1:'#2c0f24', sky2:'#8c2f48', bloom:'#ff2f6e', bloom2:'#ff6f8e', core:'#ffc24a', green:'#0e5a40', greenDeep:'#062e20', ink:'#0a060d' },
    { name: 'Pink Mist',     sky1:'#2a163a', sky2:'#7e4070', bloom:'#ff66b3', bloom2:'#ff9ad0', core:'#ffe09a', green:'#16624a', greenDeep:'#083524', ink:'#0c0912' },
    { name: 'Cerise Deep',   sky1:'#22082a', sky2:'#741e52', bloom:'#ff1f7a', bloom2:'#ff4f9e', core:'#ffce5a', green:'#0a5036', greenDeep:'#04281a', ink:'#070410' },
    { name: 'Coral Fuchsia', sky1:'#2a1232', sky2:'#883a64', bloom:'#ff486f', bloom2:'#ff77b0', core:'#ffd870', green:'#0f5642', greenDeep:'#062c20', ink:'#0a0712' },
  ];
  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  const SKIES = ['Clear', 'Strata', 'Twin Moons', 'Pollen Storm'];
  const SCALES = ['Sparse', 'Dense', 'Teeming'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const sky = K.pick(SKIES, r);
    const scaleName = K.pick(SCALES, r);
    const density = scaleName === 'Sparse' ? 0.7 : scaleName === 'Dense' ? 1.0 : 1.35;
    const moons = K.rint(r, 1, 3);
    const event = r() < 0.08 ? K.pick(['Eclipse Bloom', 'Golden Hour', 'Seed Fall'], r) : null;
    return { pal, fmt, sky, scaleName, density, moons, event };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    const t = { Palette: p.pal.name, Field: p.fmt.t, Sky: p.sky, Density: p.scaleName, Moons: p.moons };
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── deep strange sky: zenith → low haze glow ── */
  function skyGradient(x, P, W, H, hY) {
    const g = x.createLinearGradient(0, 0, 0, hY * 1.05);
    g.addColorStop(0, K.mix(P.sky1, '#000', 0.30));
    g.addColorStop(0.34, P.sky1);
    g.addColorStop(0.72, K.mix(P.sky1, P.sky2, 0.55));
    g.addColorStop(1, K.mix(P.sky2, P.bloom, 0.18));
    x.fillStyle = g; x.fillRect(0, 0, W, hY * 1.05);
    // broad warm glow seated on horizon (atmospheric scatter)
    const gl = x.createRadialGradient(W * 0.5, hY, 0, W * 0.5, hY, W * 0.8);
    x.save(); x.globalCompositeOperation = 'screen';
    gl.addColorStop(0, K.rgba(K.mix(P.sky2, P.core, 0.25), 0.30));
    gl.addColorStop(0.5, K.rgba(P.sky2, 0.10)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, hY * 1.1); x.restore();
  }

  function strata(x, P, W, hY, r, noise) {
    x.save(); x.globalCompositeOperation = 'screen';
    const n = K.rint(r, 6, 10);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const yc = hY * (0.18 + 0.7 * t) - r() * 10;
      const h = 16 + r() * 56 * (0.5 + t);
      const a = (0.025 + t * 0.08) * (0.5 + r());
      const gg = x.createLinearGradient(0, yc - h, 0, yc + h);
      const col = K.mix(P.sky2, P.core, t * 0.4);
      gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, K.rgba(col, a)); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg; x.beginPath(); x.moveTo(0, yc - h);
      for (let xx = 0; xx <= W; xx += 26) x.lineTo(xx, yc - h + noise.fbm(xx / 240, i * 3.1, 3) * 20);
      for (let xx = W; xx >= 0; xx -= 26) x.lineTo(xx, yc + h + noise.fbm(xx / 220, i * 3.1 + 9, 3) * 20);
      x.closePath(); x.fill();
    }
    x.restore();
  }

  function volHaze(x, P, W, H, hY, noise, r) {
    K.hazeSheet(x, W, Math.floor(hY * 1.1), noise, K.mix(P.sky2, P.sky1, 0.3), 0.12, 460 + r() * 200, 'screen');
    K.hazeSheet(x, W, Math.floor(hY * 1.1), noise, K.mix(P.sky2, P.bloom, 0.25), 0.07, 300 + r() * 120, 'screen');
  }

  /* ── a strange pale moon / sun body in the sky ── */
  function moon(x, P, noise, cx, cy, rad, col, r) {
    K.bloom(x, cx, cy, rad * 3.2, col, 0.18);
    K.bloom(x, cx, cy, rad * 1.6, K.mix(col, '#fff', 0.3), 0.22);
    const lx = cx - rad * 0.3, ly = cy - rad * 0.3;
    const g = x.createRadialGradient(lx, ly, rad * 0.1, cx, cy, rad * 1.05);
    g.addColorStop(0, K.mix(col, '#fff', 0.5)); g.addColorStop(0.55, col);
    g.addColorStop(0.86, K.mix(col, P.ink, 0.4)); g.addColorStop(1, K.mix(col, P.ink, 0.62));
    x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    // faint mottle
    x.globalCompositeOperation = 'overlay';
    const step = Math.max(2, Math.floor(rad / 24));
    for (let yy = cy - rad; yy < cy + rad; yy += step) for (let xx = cx - rad; xx < cx + rad; xx += step) {
      const n = noise.fbm(xx / (rad * 0.6), yy / (rad * 0.6), 4);
      if (n > 0.05) { x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), Math.min(0.3, n * 0.3)); x.fillRect(xx, yy, step * 1.5, step * 1.5); }
      else if (n < -0.06) { x.fillStyle = K.rgba(K.mix(col, P.ink, 0.6), Math.min(0.3, -n * 0.3)); x.fillRect(xx, yy, step * 1.5, step * 1.5); }
    }
    x.restore();
    // terminator
    x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.globalCompositeOperation = 'multiply';
    const tg = x.createRadialGradient(lx, ly, rad * 0.2, cx + rad * 0.3, cy + rad * 0.3, rad * 1.5);
    tg.addColorStop(0, 'rgba(255,255,255,1)'); tg.addColorStop(0.5, 'rgba(255,255,255,1)'); tg.addColorStop(1, K.rgba(P.ink, 0.7));
    x.fillStyle = tg; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore();
  }

  /* ── GIANT BLOOM: the colossal flower-machine. Drawn as a stem-pylon rising
       from ground to a vast petalled head with a glowing gear-core. depth = 0
       (far/hazy/small) → 1 (near/bold/large). ── */
  function bloomGiant(x, P, noise, gx, groundY, scale, depth, r, type, topLimit) {
    // foliage tint: far blooms shift toward sky haze (aerial perspective)
    const bloomHue = K.mix(r() < 0.5 ? P.bloom : P.bloom2, P.sky2, (1 - depth) * 0.5);
    const greenC = K.mix(P.green, P.sky2, (1 - depth) * 0.45);
    const greenD = K.mix(P.greenDeep, P.sky2, (1 - depth) * 0.4);
    const coreC = K.mix(P.core, P.sky2, (1 - depth) * 0.3);

    let stemH = scale * (1.9 + r() * 1.0);          // tower-tall stem
    const headR = scale * (0.5 + r() * 0.3);        // bloom-head radius
    // clamp only to keep the bloom CENTER on-canvas (petals may overhang top)
    if (topLimit != null) stemH = Math.min(stemH, groundY - topLimit - headR * 0.8);
    stemH = Math.max(stemH, scale * 1.2);
    const headY = groundY - stemH;
    const stemW = scale * (0.05 + r() * 0.035);

    // ── stem: tall pylon, slight sway, with node-rings (machine fusion) ──
    const sway = (r() - 0.5) * scale * 0.5;
    x.save();
    // stem body as tapered ribbon
    const segs = 14;
    const stemPts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const yy = groundY - stemH * t;
      const xx = gx + sway * t * t + noise.fbm(t * 2.4, gx * 0.01, 2) * scale * 0.18 * t;
      stemPts.push([xx, yy, t]);
    }
    x.beginPath();
    for (let i = 0; i <= segs; i++) { const [px, py, t] = stemPts[i]; const w = stemW * (1.1 - t * 0.55); x[i ? 'lineTo' : 'moveTo'](px - w, py); }
    for (let i = segs; i >= 0; i--) { const [px, py, t] = stemPts[i]; const w = stemW * (1.1 - t * 0.55); x.lineTo(px + w, py); }
    x.closePath();
    const sg = x.createLinearGradient(gx - stemW, headY, gx + stemW, groundY);
    sg.addColorStop(0, K.mix(greenC, '#fff', 0.30)); sg.addColorStop(0.5, K.mix(greenC, '#fff', 0.1)); sg.addColorStop(1, K.mix(greenD, greenC, 0.4));
    x.fillStyle = sg; x.fill();
    // stem core-line shadow
    x.strokeStyle = K.rgba(greenD, 0.5); x.lineWidth = stemW * 0.3;
    x.beginPath(); for (let i = 0; i <= segs; i++) { const [px, py] = stemPts[i]; x[i ? 'lineTo' : 'moveTo'](px, py); } x.stroke();

    // machine node-rings on the stem (subtle, faintly mechanical)
    if (r() < 0.8) {
      const nodes = K.rint(r, 2, 4);
      for (let k = 1; k <= nodes; k++) {
        const t = k / (nodes + 1);
        const [px, py] = stemPts[Math.floor(t * segs)];
        const w = stemW * (1.1 - t * 0.55);
        x.save(); x.translate(px, py); x.scale(1, 0.32);
        x.strokeStyle = K.rgba(K.mix(greenC, P.ink, 0.3), 0.55); x.lineWidth = scale * 0.02;
        x.beginPath(); x.arc(0, 0, w * 1.9, 0, Math.PI * 2); x.stroke();
        x.restore();
      }
    }
    // a couple of giant fronds/leaves branching off
    const leaves = K.rint(r, 1, 3);
    for (let l = 0; l < leaves; l++) {
      const t = 0.25 + r() * 0.4;
      const [px, py] = stemPts[Math.floor(t * segs)];
      const dir = r() < 0.5 ? -1 : 1;
      const ll = scale * (0.6 + r() * 0.7), lift = scale * (0.2 + r() * 0.4);
      x.beginPath(); x.moveTo(px, py);
      x.quadraticCurveTo(px + dir * ll * 0.5, py - lift, px + dir * ll, py - lift * 0.3);
      x.quadraticCurveTo(px + dir * ll * 0.5, py + scale * 0.06, px, py);
      x.closePath();
      const lg = x.createLinearGradient(px, py - lift, px + dir * ll, py);
      lg.addColorStop(0, greenC); lg.addColorStop(1, greenD);
      x.fillStyle = lg; x.fill();
      x.strokeStyle = K.rgba(greenD, 0.4); x.lineWidth = scale * 0.012;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + dir * ll * 0.5, py - lift * 0.6, px + dir * ll, py - lift * 0.3); x.stroke();
    }
    x.restore();

    // head center sits at top of stem
    const [hx, hy] = stemPts[segs];

    // soft AO under the head onto the field
    K.softShadow(x, gx, groundY, scale * 1.1, 0.18 * depth);

    // ── bloom-head ── (orbs/bulbs read heavier than airy petals → shrink them)
    const hR = (type === 'orb' || type === 'bulb') ? headR * 0.62 : headR;
    drawHead(x, P, noise, hx, hy, hR, bloomHue, coreC, greenD, depth, r, type);
  }

  function drawHead(x, P, noise, hx, hy, headR, bloomHue, coreC, greenD, depth, r, type) {
    // big soft halo of light behind the head
    K.bloom(x, hx, hy, headR * 2.4, bloomHue, 0.12 + depth * 0.1);

    if (type === 'orb') {
      // SEED-ORB: dense spherical seed-head with gear-core
      const g = x.createRadialGradient(hx - headR * 0.3, hy - headR * 0.3, headR * 0.1, hx, hy, headR);
      g.addColorStop(0, K.mix(bloomHue, '#fff', 0.4)); g.addColorStop(0.6, bloomHue); g.addColorStop(1, K.mix(bloomHue, P.ink, 0.5));
      x.save(); x.beginPath(); x.arc(hx, hy, headR, 0, Math.PI * 2); x.clip();
      x.fillStyle = g; x.fillRect(hx - headR, hy - headR, headR * 2, headR * 2);
      // seed dimples — radial dotted texture
      x.globalCompositeOperation = 'overlay';
      const rings = Math.floor(headR / 6);
      for (let ri = 1; ri < rings; ri++) {
        const rr = (ri / rings) * headR;
        const cnt = Math.max(6, Math.floor(rr * 0.7));
        for (let s = 0; s < cnt; s++) {
          const a = (s / cnt) * Math.PI * 2 + ri * 0.4;
          const sx = hx + Math.cos(a) * rr, sy = hy + Math.sin(a) * rr;
          x.fillStyle = K.rgba(s % 2 ? K.mix(bloomHue, '#fff', 0.5) : K.mix(bloomHue, P.ink, 0.5), 0.18);
          x.beginPath(); x.arc(sx, sy, headR * 0.03, 0, Math.PI * 2); x.fill();
        }
      }
      x.restore();
      gearCore(x, P, hx, hy, headR * 0.32, coreC, r, depth);
      return;
    }

    if (type === 'bulb') {
      // BULB-TOWER: elongated bulb head, banded, tipped with a glowing bud
      const bh = headR * 1.7;
      const g = x.createLinearGradient(hx - headR, hy, hx + headR, hy);
      g.addColorStop(0, K.mix(bloomHue, P.ink, 0.35)); g.addColorStop(0.5, K.mix(bloomHue, '#fff', 0.25)); g.addColorStop(1, K.mix(bloomHue, P.ink, 0.35));
      x.save();
      x.beginPath();
      x.moveTo(hx, hy + bh * 0.5);
      x.quadraticCurveTo(hx - headR, hy + bh * 0.1, hx - headR * 0.5, hy - bh * 0.3);
      x.quadraticCurveTo(hx, hy - bh * 0.75, hx + headR * 0.5, hy - bh * 0.3);
      x.quadraticCurveTo(hx + headR, hy + bh * 0.1, hx, hy + bh * 0.5);
      x.closePath();
      x.fillStyle = g; x.fill();
      x.clip();
      // vertical banding (machine-segmented)
      x.globalCompositeOperation = 'overlay';
      const bands = K.rint(r, 4, 7);
      for (let b = 0; b < bands; b++) {
        const by = hy + bh * 0.5 - (b / bands) * bh;
        x.fillStyle = K.rgba(b % 2 ? K.mix(bloomHue, '#fff', 0.4) : K.mix(bloomHue, P.ink, 0.5), 0.12);
        x.fillRect(hx - headR, by, headR * 2, bh / bands);
      }
      x.restore();
      // glowing tip bud
      K.bloom(x, hx, hy - bh * 0.55, headR * 0.8, coreC, 0.4);
      x.fillStyle = K.rgba(K.mix(coreC, '#fff', 0.4), 0.9);
      x.beginPath(); x.arc(hx, hy - bh * 0.55, headR * 0.16, 0, Math.PI * 2); x.fill();
      return;
    }

    // DEFAULT: PETALLED HEAD — vast ring(s) of petals around a gear-core
    const petalRings = type === 'double' ? 2 : 1;
    for (let ring = petalRings - 1; ring >= 0; ring--) {
      const rScale = 1 - ring * 0.32;
      const pCount = K.rint(r, 9, 14) + ring * 2;
      const pLen = headR * (1.05 - ring * 0.18) * rScale * 1.6;
      const pWid = headR * (0.42 - ring * 0.05);
      const baseRot = r() * Math.PI * 2 + ring * 0.4;
      const ringHue = ring === 0 ? bloomHue : K.mix(bloomHue, P.core, 0.25);
      for (let p = 0; p < pCount; p++) {
        const a = baseRot + (p / pCount) * Math.PI * 2;
        x.save(); x.translate(hx, hy); x.rotate(a);
        // petal as a teardrop
        const innerR = headR * 0.28 * rScale;
        x.beginPath();
        x.moveTo(0, -innerR);
        x.bezierCurveTo(-pWid, -innerR - pLen * 0.35, -pWid * 0.55, -innerR - pLen, 0, -innerR - pLen);
        x.bezierCurveTo(pWid * 0.55, -innerR - pLen, pWid, -innerR - pLen * 0.35, 0, -innerR);
        x.closePath();
        // petal gradient: bright tip-edge → deep base, hot toward center
        const pg = x.createLinearGradient(0, -innerR, 0, -innerR - pLen);
        pg.addColorStop(0, K.mix(ringHue, P.core, 0.4));
        pg.addColorStop(0.4, ringHue);
        pg.addColorStop(0.82, K.mix(ringHue, '#fff', 0.22));
        pg.addColorStop(1, K.mix(ringHue, P.ink, 0.25));
        x.fillStyle = pg; x.fill();
        // central vein
        x.strokeStyle = K.rgba(K.mix(ringHue, P.ink, 0.4), 0.3); x.lineWidth = pWid * 0.06;
        x.beginPath(); x.moveTo(0, -innerR); x.lineTo(0, -innerR - pLen * 0.9); x.stroke();
        x.restore();
      }
    }
    // gear-core hub
    gearCore(x, P, hx, hy, headR * 0.4, coreC, r, depth);
  }

  /* ── glowing mechanical gear-core at a bloom center ── */
  function gearCore(x, P, cx, cy, rad, coreC, r, depth) {
    // disc base
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.mix(coreC, '#fff', 0.6)); g.addColorStop(0.5, coreC); g.addColorStop(1, K.mix(coreC, P.ink, 0.4));
    x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fillStyle = g; x.fill();
    // gear teeth (subtle machine fusion)
    const teeth = K.rint(r, 10, 16);
    x.fillStyle = K.rgba(K.mix(coreC, P.ink, 0.45), 0.5);
    for (let t = 0; t < teeth; t++) {
      const a = (t / teeth) * Math.PI * 2;
      x.save(); x.translate(cx, cy); x.rotate(a);
      x.fillRect(rad * 0.92, -rad * 0.07, rad * 0.22, rad * 0.14);
      x.restore();
    }
    // inner ring + center seed
    x.strokeStyle = K.rgba(K.mix(coreC, P.ink, 0.4), 0.5); x.lineWidth = rad * 0.06;
    x.beginPath(); x.arc(cx, cy, rad * 0.55, 0, Math.PI * 2); x.stroke();
    x.fillStyle = K.rgba(K.mix(coreC, '#fff', 0.5), 0.95);
    x.beginPath(); x.arc(cx, cy, rad * 0.22, 0, Math.PI * 2); x.fill();
    x.restore();
    // glow
    K.bloom(x, cx, cy, rad * 2.0, coreC, 0.3 + depth * 0.2);
  }

  /* ── tiny scale-markers (figures/posts) at the field base for "skyscraper" read ── */
  function scaleMarkers(x, P, W, groundY, r, count) {
    x.save();
    for (let i = 0; i < count; i++) {
      const mx = W * (0.08 + r() * 0.84);
      const mh = 9 + r() * 11; // tiny vs the towering blooms
      // faint backlight rim so the figure reads against the dark field
      x.fillStyle = K.rgba(K.mix(P.core, '#fff', 0.4), 0.18);
      x.beginPath(); x.arc(mx + 0.9, groundY - mh * 0.55, mh * 0.55, 0, Math.PI * 2); x.fill();
      x.fillStyle = K.rgba(K.mix(P.ink, '#000', 0.3), 0.85);
      // a little post + head (figure)
      x.fillRect(mx, groundY - mh, mh * 0.16, mh);
      x.beginPath(); x.arc(mx + mh * 0.08, groundY - mh - mh * 0.13, mh * 0.18, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  /* ── the field ground: hazy receding green valley ── */
  function field(x, P, W, H, groundY, r, noise) {
    const gg = x.createLinearGradient(0, groundY - 20, 0, H);
    gg.addColorStop(0, K.mix(P.green, P.sky2, 0.55));       // lit far field blends to haze
    gg.addColorStop(0.4, K.mix(P.green, '#fff', 0.05));     // lush lit mid-field
    gg.addColorStop(1, K.mix(P.greenDeep, P.green, 0.5));   // still-green near foreground (no crush)
    x.fillStyle = gg; x.fillRect(0, groundY - 20, W, H - groundY + 20);
    // rolling fbm texture on the field
    K.mottle(x, 0, groundY, W, H - groundY, P.green, 2400, r, 'overlay');
    // soft haze hugging the field edge (far blooms sink into it)
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, groundY - H * 0.1, 0, groundY + H * 0.05);
    hb.addColorStop(0, 'rgba(0,0,0,0)'); hb.addColorStop(0.6, K.rgba(K.mix(P.sky2, P.bloom, 0.2), 0.2)); hb.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hb; x.fillRect(0, groundY - H * 0.1, W, H * 0.15); x.restore();
  }

  function motes(x, P, W, H, hY, r, heavy) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = heavy ? 420 : 180;
    for (let i = 0; i < n; i++) {
      const mx = r() * W, my = r() * (H * 0.92);
      const s = r() * 1.9 + 0.3;
      x.fillStyle = K.rgba(r() < 0.4 ? P.core : K.mix(P.bloom, '#fff', 0.4), 0.08 + r() * 0.34);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hY = H * (p.fmt.t === 'Portal' ? 0.66 : 0.60) + (r() - 0.5) * H * 0.05;
    const groundY = hY;

    skyGradient(x, P, W, H, hY);
    if (p.sky === 'Strata') strata(x, P, W, hY, r, noise);
    volHaze(x, P, W, H, hY, noise, r);

    // moons / suns in the sky
    const golden = p.event === 'Golden Hour';
    const mCount = p.sky === 'Twin Moons' ? Math.max(2, p.moons) : p.moons;
    for (let i = 0; i < mCount; i++) {
      const mr = W * (0.04 + r() * 0.07);
      const mx = W * (0.1 + r() * 0.8), my = hY * (0.12 + r() * 0.5);
      const col = i === 0 && golden ? P.core : K.mix(P.core, P.sky2, 0.3 + r() * 0.3);
      moon(x, P, noise, mx, my, mr, col, r);
    }

    field(x, P, W, H, groundY, r, noise);

    // ── GIANT BLOOMS receding across the field. Sort far→near (small depth first,
    //    drawn behind). Distribute across X with size tied to depth. ──
    const types = ['petal', 'petal', 'petal', 'double', 'orb', 'bulb'];
    const rows = [
      { yFrac: 0.01, depth: 0.18, sScale: 0.13, count: Math.round(12 * p.density), clamp: false }, // far ridge (tall, on skyline)
      { yFrac: 0.14, depth: 0.40, sScale: 0.19, count: Math.round(8 * p.density),  clamp: false }, // mid
      { yFrac: 0.36, depth: 0.65, sScale: 0.26, count: Math.round(6 * p.density),  clamp: true },  // near-mid
      { yFrac: 0.68, depth: 0.92, sScale: 0.34, count: Math.round(4 * p.density),  clamp: true },  // foreground giants
    ];
    const minDim = Math.min(W, H);
    const topPad = H * 0.015;
    for (const row of rows) {
      const gY = groundY + (H - groundY) * row.yFrac;
      const placements = [];
      for (let i = 0; i < row.count; i++) {
        placements.push({
          gx: (i + 0.5 + (r() - 0.5) * 0.8) / row.count * W,
          scale: minDim * row.sScale * (0.8 + r() * 0.4),
          type: K.pick(types, r),
        });
      }
      for (const pl of placements) bloomGiant(x, P, noise, pl.gx, gY, pl.scale, row.depth, r, pl.type, row.clamp ? topPad : null);
      // mid-haze pass between rows to push depth
      if (row.depth < 0.8) K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.bloom, 0.2), 0.05, 260, 'screen');
    }

    // tiny scale markers at the near field base
    scaleMarkers(x, P, W, groundY + (H - groundY) * 0.85, r, K.rint(r, 4, 9));

    // pollen / light motes drifting
    motes(x, P, W, H, hY, r, p.sky === 'Pollen Storm');

    // seed fall event — drifting seed flecks with tails
    if (p.event === 'Seed Fall') {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) {
        const sx = r() * W, sy = r() * H * 0.8, len = 8 + r() * 22;
        x.strokeStyle = K.rgba(P.core, 0.2 + r() * 0.3); x.lineWidth = 0.8 + r();
        x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 4, sy + len); x.stroke();
      }
      x.restore();
    }

    // finishing atmosphere
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.bloom, 0.3), 0.04, 220, 'screen');
    K.grain(x, W, H, 520, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.34); x.restore();
    // gentle top darkening for depth
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(K.mix(P.sky1, '#000', 0.4), 0.30)); tg.addColorStop(0.4, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 't_garden', draw, traits };
})();
