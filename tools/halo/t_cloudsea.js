/* CLOUDSEA — an ocean of clouds at dawn with a colossus breaching.
 * A boundless SEA OF CLOUDS seen from above, billowing in layered waves to a
 * far curved horizon, with a COLOSSAL abstract form half-submerged and
 * breaching through the cloud surface — a vast monument head, an arch, a
 * sunken titan-ring, or a mountain-of-glass — dwarfing everything. Shafts of
 * dawn light rake across the cloud tops; smaller islands poke through;
 * birds/specks give scale. Awe + immense scale; "real but off" = something
 * enormous sleeps in the clouds.
 * Volumetric billowy clouds via fbm, soft self-shadowing, god-rays, glow.
 * SOFT SATURATED DAWN: peach, rose, apricot, pale gold, periwinkle, cloud-cream
 * — lit warm, cool periwinkle shadows. RICH & luminous, never washed-out.
 * NOT outrun/synthwave, NOT dark-night, NOT deep-blue/green/red-desert. */
window.ENGINE = (function () {
  const K = window.KIT;

  // sky1=high zenith, sky2=mid sky, glow=horizon dawn-burst, sun=hot light,
  // cloudLit=warm sun-struck cloud top, cloudShad=cool periwinkle cloud shadow,
  // deep=deepest valley/atmosphere, mono=colossus base stone/glass.
  const PALS = [
    { name: 'Peach Aurora',   sky1: '#8fa6e8', sky2: '#c9b6e6', glow: '#ffb07a', sun: '#fff0cf', cloudLit: '#ffd9b0', cloudShad: '#9a93d6', deep: '#6f6db8', mono: '#e8c6c0' },
    { name: 'Rose Quartz',    sky1: '#9fb0e6', sky2: '#dcb4d6', glow: '#ff9bb0', sun: '#ffeede', cloudLit: '#ffcad2', cloudShad: '#a394d2', deep: '#7c6fb4', mono: '#f0cdd0' },
    { name: 'Apricot Drift',  sky1: '#86a2ea', sky2: '#cdb2db', glow: '#ffa860', sun: '#fff2d0', cloudLit: '#ffce9a', cloudShad: '#928ed4', deep: '#6a6cba', mono: '#eccab0' },
    { name: 'Periwinkle Dawn',sky1: '#7e92e6', sky2: '#b8aee6', glow: '#ffc0a0', sun: '#fff4e2', cloudLit: '#ffd6c0', cloudShad: '#8f8ad8', deep: '#6360b6', mono: '#dcc6e0' },
    { name: 'Gilded Cream',   sky1: '#9ab0e2', sky2: '#d6c2dc', glow: '#ffcd6e', sun: '#fff6da', cloudLit: '#ffe3ad', cloudShad: '#9d96cf', deep: '#74709e', mono: '#f0dcc0' },
    { name: 'Coral Halcyon',  sky1: '#92a4ea', sky2: '#e0b6cc', glow: '#ff9070', sun: '#ffeede', cloudLit: '#ffc0a4', cloudShad: '#9a8fd4', deep: '#6f68b6', mono: '#f0c8c2' },
    { name: 'Lilac Sunrise',  sky1: '#8a98e8', sky2: '#c8aede', glow: '#ffae8c', sun: '#fff1e0', cloudLit: '#ffd2bc', cloudShad: '#9489d8', deep: '#665fb6', mono: '#e6cae0' },
    { name: 'Honey Mist',     sky1: '#9cabdf', sky2: '#d8c0d2', glow: '#ffbe78', sun: '#fff4d6', cloudLit: '#ffdca0', cloudShad: '#9b92cc', deep: '#726ca0', mono: '#eed8bc' },
  ];

  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  const COLOSSI = ['Monument Head', 'Titan Arch', 'Sunken Ring', 'Glass Mountain', 'Fallen Crown'];
  const LIGHTS = ['First Light', 'Golden Hour', 'High Dawn', 'Mist Veil'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const colossus = K.pick(COLOSSI, r);
    const light = K.pick(LIGHTS, r);
    const godrays = r() < 0.85;
    const islands = K.rint(r, 2, 5);
    const birds = r() < 0.78;
    const event = r() < 0.08 ? K.pick(['Twin Colossus', 'Aurora Veil', 'Lightfall'], r) : null;
    return { pal, fmt, colossus, light, godrays, islands, birds, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = { Palette: p.pal.name, View: p.fmt.t, Colossus: p.colossus, Light: p.light, Islands: p.islands >= 4 ? 'Many' : 'Few' };
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── deep dawn sky: cool periwinkle zenith → warm glow seated at horizon ── */
  function sky(x, P, W, H, hY) {
    const g = x.createLinearGradient(0, 0, 0, hY * 1.05);
    g.addColorStop(0, K.mix(P.sky1, P.deep, 0.30));
    g.addColorStop(0.30, P.sky1);
    g.addColorStop(0.62, K.mix(P.sky1, P.sky2, 0.7));
    g.addColorStop(0.85, K.mix(P.sky2, P.glow, 0.55));
    g.addColorStop(1, K.mix(P.glow, P.sun, 0.35));
    x.fillStyle = g; x.fillRect(0, 0, W, Math.ceil(hY * 1.05));
  }

  /* ── the dawn sun: a hot luminous burst seated low near the horizon ── */
  function sunBurst(x, P, W, hY, sx, sy, sunR) {
    K.bloom(x, sx, sy, sunR * 6.0, P.glow, 0.30);
    K.bloom(x, sx, sy, sunR * 3.4, K.mix(P.glow, P.sun, 0.5), 0.34);
    K.bloom(x, sx, sy, sunR * 1.7, P.sun, 0.55);
    // hot core — warm gold, not blown white
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(sx, sy, 0, sx, sy, sunR);
    g.addColorStop(0, K.rgba(K.mix(P.sun, '#fff', 0.5), 0.85));
    g.addColorStop(0.35, K.rgba(P.sun, 0.6));
    g.addColorStop(0.7, K.rgba(K.mix(P.sun, P.glow, 0.5), 0.35));
    g.addColorStop(1, K.rgba(P.glow, 0));
    x.fillStyle = g; x.beginPath(); x.arc(sx, sy, sunR, 0, Math.PI * 2); x.fill();
    x.restore();
  }

  /* ── a soft curved horizon band: the planet's edge, glowing ── */
  function horizonBand(x, P, W, hY, sx) {
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, hY - 70, 0, hY + 40);
    hb.addColorStop(0, 'rgba(0,0,0,0)');
    hb.addColorStop(0.55, K.rgba(K.mix(P.glow, P.sun, 0.4), 0.40));
    hb.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hb; x.fillRect(0, hY - 70, W, 110);
    x.restore();
  }

  /* ── ONE billowing cloud puff stamped with fbm — soft, self-shadowed.
       cx,cy = top-center of puff; rad = scale; lit warm top, cool underside. ── */
  function puff(x, P, noise, cx, cy, rad, r, depth, sunDir) {
    // depth 0 (far/hazy) → 1 (near/crisp). Far puffs are smaller & cooler.
    // sunDir = -1 sun to the left, +1 sun to the right (lights that flank).
    sunDir = sunDir || -1;
    const litCol = K.mix(P.cloudLit, P.glow, 0.22 * (1 - depth));
    const hotCol = K.mix(P.cloudLit, P.sun, 0.45);
    const shadCol = K.mix(P.cloudShad, P.deep, 0.35 * (1 - depth));
    const step = Math.max(2, Math.floor(rad / 40));
    const ry = rad * 0.78; // rounder, more billowy
    // jitter the noise sample origin per puff so each crest differs
    const ox = cx * 0.013, oy = cy * 0.013 + depth * 9;
    x.save();
    // clip to a soft lumpy cauliflower silhouette
    x.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI * 2 / 80) {
      const wob = 1 + 0.30 * noise.fbm(Math.cos(a) * 2.1 + ox * 30, Math.sin(a) * 2.1 + oy * 30, 4)
                    + 0.10 * Math.sin(a * 7 + cx);
      const px = cx + Math.cos(a) * rad * wob;
      const py = cy + Math.sin(a) * ry * wob * (a > Math.PI ? 0.78 : 1); // flatter base
      if (a === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath(); x.clip();
    // fbm volume fill — billows lit on top + sun side, shadowed in valleys/base
    for (let yy = cy - rad * 1.05; yy < cy + ry * 1.05; yy += step) {
      for (let xx = cx - rad * 1.35; xx < cx + rad * 1.35; xx += step) {
        const n = (noise.fbm((xx) / (rad * 0.42) + ox, (yy) / (rad * 0.40) + oy, 5, 0.56, 2.2) + 1) / 2;
        if (n < 0.34) continue;
        const vt = K.clamp((yy - (cy - rad)) / (rad + ry), 0, 1);    // 0 top → 1 base
        const ht = (xx - cx) / rad;                                   // -1..1 horiz
        // self-shadow: top + sun-facing flank lit, opposite flank & base dark
        let lightAmt = (1 - vt) * 1.15 + (ht * sunDir) * 0.35 + (n - 0.5) * 0.6;
        lightAmt = K.clamp(lightAmt, 0, 1);
        let col;
        if (lightAmt > 0.72) col = K.mix(litCol, hotCol, (lightAmt - 0.72) / 0.28);
        else col = K.mix(shadCol, litCol, lightAmt / 0.72);
        const a = K.clamp((n - 0.34) * 1.7, 0, 1) * (0.62 + 0.38 * lightAmt) * (0.6 + 0.4 * depth);
        x.fillStyle = K.rgba(col, a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    // warm rim-light catching the sun-facing crest
    x.globalCompositeOperation = 'lighter';
    const rcx = cx + sunDir * rad * 0.3, rcy = cy - rad * 0.5;
    const rim = x.createRadialGradient(rcx, rcy, 0, rcx, rcy, rad * 1.0);
    rim.addColorStop(0, K.rgba(K.mix(P.sun, '#fff', 0.35), 0.32 * (0.4 + depth)));
    rim.addColorStop(0.5, K.rgba(P.glow, 0.12 * (0.4 + depth)));
    rim.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rim; x.fillRect(cx - rad * 1.4, cy - rad * 1.4, rad * 2.8, rad * 2.8);
    x.restore();
  }

  /* ── the cloud SEA: many overlapping rows of puffs far→near. Each row is a
       wave of crests; rows overlap heavily so it reads as one thick billowing
       MASS, not stripes. Puffs vary in size; a cool valley shadow recedes. ── */
  function cloudSea(x, P, W, H, hY, noise, r, sx) {
    const sunDir = sx < W * 0.5 ? -1 : 1;
    const rows = 11;
    // precompute placements so we can sort by y (painter's order, far→near)
    const all = [];
    for (let row = 0; row < rows; row++) {
      const t = row / (rows - 1);                       // 0 far → 1 near
      const depth = 0.14 + 0.86 * t;
      // perspective compression: rows bunch near the horizon, spread toward viewer
      const baseY = hY + (H - hY) * Math.pow(t, 1.55) - (H - hY) * 0.04;
      const puffR = (W * 0.020) + (W * 0.080) * Math.pow(t, 0.9);
      const spacing = puffR * (1.15 - 0.25 * t);          // tight → heavy overlap
      const yJit = puffR * 0.55;
      let xx = -spacing * (0.6 + r());
      while (xx < W + spacing) {
        const jx = xx + (r() - 0.5) * spacing * 0.6;
        const wave = noise.fbm(jx / (W * 0.16), row * 4.3, 3) * yJit * 1.7;
        const jy = baseY + (r() - 0.5) * yJit - wave;
        const rr = puffR * (0.72 + r() * 0.85);
        all.push({ jx, jy, rr, depth, baseY, t });
        xx += spacing * (0.62 + r() * 0.5);
      }
    }
    all.sort((a, b) => a.jy - b.jy);
    for (const p of all) {
      // a soft cool valley shadow just under each crest sells the billows
      x.save(); x.globalCompositeOperation = 'multiply';
      const sh = x.createRadialGradient(p.jx, p.jy + p.rr * 0.55, 0, p.jx, p.jy + p.rr * 0.55, p.rr * 1.2);
      sh.addColorStop(0, K.rgba(K.mix(P.cloudShad, P.deep, 0.5), 0.10 + 0.10 * p.t));
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = sh; x.fillRect(p.jx - p.rr * 1.3, p.jy - p.rr * 0.4, p.rr * 2.6, p.rr * 1.9);
      x.restore();
      puff(x, P, noise, p.jx, p.jy, p.rr, r, p.depth, sunDir);
    }
  }

  /* ── god-rays: soft volumetric shafts fanning from the sun across cloud tops ── */
  function godRays(x, P, W, H, hY, sx, sy, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = K.rint(r, 7, 12);
    for (let i = 0; i < n; i++) {
      const ang = (-Math.PI * 0.5) + (r() - 0.5) * 1.7;      // fan downward-ish
      const len = H * (0.7 + r() * 0.55);
      const wTop = W * (0.004 + r() * 0.01);
      const wBot = W * (0.05 + r() * 0.10);
      const ex = sx + Math.cos(ang + Math.PI / 2) * 0; // anchor at sun
      x.translate(sx, sy); x.rotate(ang + Math.PI / 2);
      const g = x.createLinearGradient(0, 0, 0, len);
      const col = K.mix(P.sun, P.glow, r() * 0.4);
      g.addColorStop(0, K.rgba(col, 0.0));
      g.addColorStop(0.14, K.rgba(col, 0.16 + r() * 0.10));
      g.addColorStop(0.55, K.rgba(col, 0.06));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(-wTop / 2, 0); x.lineTo(wTop / 2, 0);
      x.lineTo(wBot / 2, len); x.lineTo(-wBot / 2, len);
      x.closePath(); x.fill();
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
    x.restore();
  }

  /* ── volumetric haze sheets over the sea for atmospheric depth ── */
  function haze(x, P, W, H, hY, noise, r) {
    K.hazeSheet(x, W, H, noise, K.mix(P.glow, P.sun, 0.4), 0.10, 520 + r() * 220, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.cloudShad, P.sky2, 0.5), 0.06, 300 + r() * 120, 'screen');
    // low warm mist hugging the far horizon line where sea meets sky
    x.save(); x.globalCompositeOperation = 'screen';
    const m = x.createLinearGradient(0, hY - 30, 0, hY + H * 0.20);
    m.addColorStop(0, K.rgba(P.glow, 0.0));
    m.addColorStop(0.25, K.rgba(K.mix(P.glow, P.sun, 0.4), 0.22));
    m.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = m; x.fillRect(0, hY - 30, W, H * 0.22 + 30);
    x.restore();
  }

  /* ── melt the far cloud line into the sky: a soft warm haze that thickens
       toward the horizon, dissolving the hard top edge of the cloud sea ── */
  function horizonFade(x, P, W, H, hY, sx, sy) {
    x.save(); x.globalCompositeOperation = 'screen';
    // warm wash densest at the horizon, fading up into sky and down into sea
    const band = H * 0.16;
    const g = x.createLinearGradient(0, hY - band * 0.7, 0, hY + band);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, K.rgba(K.mix(P.glow, P.sun, 0.45), 0.42));
    g.addColorStop(0.7, K.rgba(K.mix(P.glow, P.cloudLit, 0.5), 0.22));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, hY - band * 0.7, W, band * 1.7);
    // extra glow lobe seated on the horizon under the sun (atmospheric scatter)
    const gl = x.createRadialGradient(sx, hY, 0, sx, hY, W * 0.6);
    gl.addColorStop(0, K.rgba(K.mix(P.sun, P.glow, 0.4), 0.30));
    gl.addColorStop(0.5, K.rgba(P.glow, 0.10));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, hY - W * 0.3, W, W * 0.6);
    x.restore();
  }

  /* ── THE COLOSSUS: a vast abstract monument breaching the cloud surface,
       half-submerged, dwarfing the sea. Silhouette is lit warm on the sun
       side, cool periwinkle on the shadow side, with rim-light + haze sink. ── */
  function colossus(x, P, noise, W, H, hY, kind, sx, sy, r, cxIn, scale) {
    const breachY = hY + (H - hY) * (0.42 + r() * 0.12);  // where it cuts the sea
    const cx = cxIn != null ? cxIn : W * (0.30 + r() * 0.40);
    const sScale = scale || 1;
    const sunLeft = sx < cx; // sun side for lighting
    const sunSign = sunLeft ? -1 : 1;
    const litCol = K.mix(P.mono, P.glow, 0.38);
    const midCol = K.mix(P.mono, P.cloudShad, 0.30);
    const shadCol = K.mix(P.deep, '#2a2350', 0.45); // genuinely dark, weighty shadow side

    // big atmospheric scatter halo behind the form (it glows against dawn)
    K.bloom(x, cx, breachY - H * 0.12 * sScale, W * 0.30 * sScale, P.glow, 0.16);

    function shadeShape(pathFn, topY, botY) {
      // 1) opaque solid base so the form never looks see-through
      x.save(); pathFn(); x.clip();
      const g = x.createLinearGradient(0, topY, 0, botY);
      g.addColorStop(0, K.mix(litCol, P.sun, 0.18));
      g.addColorStop(0.40, midCol);
      g.addColorStop(0.80, K.mix(midCol, shadCol, 0.6));
      g.addColorStop(1, shadCol);
      x.fillStyle = g; x.fillRect(cx - W, topY - 40, W * 2, botY - topY + 80);
      // 2) strong directional form-shadow: bright sun flank → deep dark far flank
      const sg = x.createLinearGradient(cx - sunSign * W * 0.42, 0, cx + sunSign * W * 0.42, 0);
      x.globalCompositeOperation = 'multiply';
      sg.addColorStop(0, 'rgba(255,255,255,1)');
      sg.addColorStop(0.40, 'rgba(255,255,255,1)');
      sg.addColorStop(0.75, K.rgba(K.mix(P.deep, '#1a1640', 0.5), 0.6));
      sg.addColorStop(1, K.rgba('#15123a', 0.82));
      x.fillStyle = sg; x.fillRect(cx - W, topY - 40, W * 2, botY - topY + 80);
      // 3) fbm stone/glass texture
      x.globalCompositeOperation = 'overlay';
      const stp = Math.max(2, Math.floor(W / 360));
      for (let yy = topY; yy < botY; yy += stp) {
        for (let xx = cx - W * 0.45; xx < cx + W * 0.45; xx += stp) {
          const n = noise.fbm(xx / (W * 0.09), yy / (W * 0.09), 5, 0.5, 2.2);
          if (n > 0.04) { x.fillStyle = K.rgba(K.mix(P.mono, '#fff', 0.6), Math.min(0.45, n * 0.5)); x.fillRect(xx, yy, stp + 1, stp + 1); }
          else if (n < -0.04) { x.fillStyle = K.rgba(shadCol, Math.min(0.5, -n * 0.5)); x.fillRect(xx, yy, stp + 1, stp + 1); }
        }
      }
      x.restore();
      // 4) bright warm rim-light hugging the sun-facing silhouette edge
      x.save(); pathFn(); x.clip(); x.globalCompositeOperation = 'lighter';
      const rg = x.createLinearGradient(cx - sunSign * W * 0.5, 0, cx + sunSign * W * 0.1, 0);
      rg.addColorStop(0, K.rgba(K.mix(P.sun, '#fff', 0.4), 0.62));
      rg.addColorStop(0.22, K.rgba(P.glow, 0.14));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = rg; x.fillRect(cx - W, topY - 40, W * 2, botY - topY + 80);
      x.restore();
    }

    const hW = W * 0.20 * sScale;          // half-width of the form
    const topY = breachY - H * (0.34 * sScale + r() * 0.06);

    if (kind === 'Monument Head') {
      // a colossal abstract head: rounded crown, brow plane, jaw sinking into cloud
      const headFn = () => {
        x.beginPath();
        x.moveTo(cx - hW, breachY);
        x.bezierCurveTo(cx - hW * 1.05, topY + (breachY - topY) * 0.35, cx - hW * 0.7, topY, cx, topY);
        x.bezierCurveTo(cx + hW * 0.7, topY, cx + hW * 1.05, topY + (breachY - topY) * 0.35, cx + hW, breachY);
        x.lineTo(cx - hW, breachY); x.closePath();
      };
      shadeShape(headFn, topY, breachY);
      // brow ridge + eye sockets (abstract, dark recesses)
      x.save(); headFn(); x.clip(); x.globalCompositeOperation = 'multiply';
      const eyY = topY + (breachY - topY) * 0.52;
      for (const ex of [cx - hW * 0.42, cx + hW * 0.42]) {
        const eg = x.createRadialGradient(ex, eyY, 0, ex, eyY, hW * 0.30);
        eg.addColorStop(0, K.rgba(P.deep, 0.6)); eg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = eg; x.fillRect(ex - hW * 0.3, eyY - hW * 0.3, hW * 0.6, hW * 0.6);
      }
      // brow shelf shadow
      const bg = x.createLinearGradient(0, topY + (breachY - topY) * 0.34, 0, topY + (breachY - topY) * 0.5);
      bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, K.rgba(P.deep, 0.4));
      x.fillStyle = bg; x.fillRect(cx - hW, topY + (breachY - topY) * 0.34, hW * 2, (breachY - topY) * 0.16);
      x.restore();
    } else if (kind === 'Titan Arch') {
      const archFn = () => {
        const oW = hW, iW = hW * 0.52, legTop = topY + (breachY - topY) * 0.30;
        x.beginPath();
        x.moveTo(cx - oW, breachY);
        x.lineTo(cx - oW, legTop);
        x.bezierCurveTo(cx - oW, topY, cx + oW, topY, cx + oW, legTop);
        x.lineTo(cx + oW, breachY);
        x.lineTo(cx + iW, breachY);
        x.lineTo(cx + iW, legTop + (breachY - legTop) * 0.05);
        x.bezierCurveTo(cx + iW, topY + (legTop - topY) * 0.9, cx - iW, topY + (legTop - topY) * 0.9, cx - iW, legTop + (breachY - legTop) * 0.05);
        x.lineTo(cx - iW, breachY);
        x.closePath();
      };
      shadeShape(archFn, topY, breachY);
    } else if (kind === 'Sunken Ring') {
      // a colossal tilted ring/torus half-sunk in the cloud sea
      x.save();
      const ringFn = () => {
        x.beginPath();
        x.ellipse(cx, breachY - H * 0.05, hW * 1.1, hW * 0.95, 0, Math.PI * 1.06, Math.PI * 2.0, false);
        x.ellipse(cx, breachY - H * 0.05, hW * 0.62, hW * 0.52, 0, Math.PI * 2.0, Math.PI * 1.06, true);
        x.closePath();
      };
      shadeShape(ringFn, topY, breachY + H * 0.02);
      x.restore();
    } else if (kind === 'Glass Mountain') {
      // a single colossal crystalline peak: tall, off-center apex, faceted
      const apexX = cx + (r() - 0.5) * hW * 0.5;
      const apexY = topY;
      const mtnFn = () => {
        x.beginPath();
        x.moveTo(cx - hW, breachY);
        x.lineTo(cx - hW * 0.45, breachY - (breachY - topY) * 0.45); // left shoulder
        x.lineTo(apexX, apexY);
        x.lineTo(cx + hW * 0.55, breachY - (breachY - topY) * 0.38); // right shoulder
        x.lineTo(cx + hW, breachY);
        x.closePath();
      };
      shadeShape(mtnFn, topY, breachY);
      // crystalline facets: bold polygonal planes, brighter on the sun side
      x.save(); mtnFn(); x.clip();
      const facets = [
        [[apexX, apexY], [cx - hW * 0.45, breachY - (breachY - topY) * 0.45], [cx - hW, breachY], [cx - hW * 0.1, breachY]],
        [[apexX, apexY], [cx + hW * 0.55, breachY - (breachY - topY) * 0.38], [cx + hW, breachY], [cx + hW * 0.05, breachY]],
        [[apexX, apexY], [cx - hW * 0.1, breachY], [cx + hW * 0.05, breachY]],
      ];
      for (let fi = 0; fi < facets.length; fi++) {
        const f = facets[fi];
        const onSun = (fi === 0) === sunLeft; // facet faces the sun?
        x.globalCompositeOperation = onSun ? 'lighter' : 'multiply';
        x.fillStyle = onSun
          ? K.rgba(K.mix(P.sun, '#fff', 0.4), 0.16)
          : K.rgba(K.mix(P.deep, '#1a1640', 0.4), 0.30);
        x.beginPath(); x.moveTo(f[0][0], f[0][1]); for (let k = 1; k < f.length; k++) x.lineTo(f[k][0], f[k][1]); x.closePath(); x.fill();
      }
      // a couple of crisp bright facet edges (specular glints)
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(K.mix(P.sun, '#fff', 0.5), 0.35); x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(apexX, apexY); x.lineTo(cx - hW * 0.1, breachY); x.stroke();
      x.beginPath(); x.moveTo(apexX, apexY); x.lineTo(cx + hW * 0.05, breachY); x.stroke();
      x.restore();
    } else { // Fallen Crown — a broken ring of vast spires breaching at angles
      const spikes = K.rint(r, 4, 6);
      for (let i = 0; i < spikes; i++) {
        const t = i / (spikes - 1);
        const fx = cx - hW + t * hW * 2 + (r() - 0.5) * hW * 0.2;
        const sh = (breachY - topY) * (0.45 + r() * 0.7) * (0.7 + Math.sin(t * Math.PI) * 0.6);
        const sw = hW * (0.10 + r() * 0.10);
        const tilt = (r() - 0.5) * hW * 0.25;
        const spFn = () => { x.beginPath(); x.moveTo(fx - sw, breachY); x.lineTo(fx + tilt, breachY - sh); x.lineTo(fx + sw, breachY); x.closePath(); };
        shadeShape(spFn, breachY - sh, breachY);
      }
    }

    // haze sinking the base into the cloud sea (the breach line)
    x.save(); x.globalCompositeOperation = 'screen';
    const sink = x.createLinearGradient(0, breachY - H * 0.10, 0, breachY + H * 0.06);
    sink.addColorStop(0, 'rgba(0,0,0,0)');
    sink.addColorStop(0.7, K.rgba(K.mix(P.cloudLit, P.glow, 0.3), 0.45));
    sink.addColorStop(1, K.rgba(P.cloudLit, 0.15));
    x.fillStyle = sink; x.fillRect(cx - W, breachY - H * 0.10, W * 2, H * 0.16);
    x.restore();
    return { cx, breachY };
  }

  /* ── small cloud-islands poking through, and distant bird specks for scale ── */
  function islandsAndBirds(x, P, noise, W, H, hY, count, birds, r) {
    // tiny secondary forms peeking through the far/mid sea (scale anchors)
    for (let i = 0; i < count; i++) {
      const t = 0.15 + r() * 0.5;
      const iy = hY + (H - hY) * (t * t) * 0.9;
      const ix = r() * W;
      const iw = W * (0.01 + t * 0.03);
      const ih = iw * (0.6 + r() * 0.5);
      x.save();
      const g = x.createLinearGradient(0, iy - ih, 0, iy + ih);
      g.addColorStop(0, K.rgba(K.mix(P.mono, P.glow, 0.3), 0.7 * t + 0.2));
      g.addColorStop(1, K.rgba(K.mix(P.mono, P.deep, 0.5), 0.4 * t + 0.1));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(ix - iw, iy);
      x.bezierCurveTo(ix - iw * 0.5, iy - ih, ix + iw * 0.5, iy - ih, ix + iw, iy);
      x.closePath(); x.fill();
      x.restore();
    }
    if (birds) {
      x.save(); x.globalCompositeOperation = 'multiply';
      const fx = W * (0.2 + r() * 0.55), fy = hY * (0.45 + r() * 0.4);
      const n = K.rint(r, 8, 20);
      for (let i = 0; i < n; i++) {
        const bx = fx + (r() - 0.5) * W * 0.28, by = fy + (r() - 0.5) * hY * 0.22;
        const s = 2.5 + r() * 4;
        x.strokeStyle = K.rgba(K.mix(P.deep, '#000', 0.2), 0.30 + r() * 0.2);
        x.lineWidth = 1.1;
        x.beginPath(); x.moveTo(bx - s, by); x.quadraticCurveTo(bx, by - s * 0.7, bx + s * 0.1, by);
        x.quadraticCurveTo(bx + s * 0.2, by - s * 0.7, bx + s * 1.1, by); x.stroke();
      }
      x.restore();
    }
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hY = H * (p.fmt.t === 'Portal' ? 0.30 : 0.34) + (r() - 0.5) * H * 0.05;

    const sx = W * (0.30 + r() * 0.40);
    const sy = hY * (0.42 + r() * 0.30);
    const sunR = W * (0.045 + r() * 0.025);

    // 1. sky + dawn sun + horizon glow
    sky(x, P, W, H, hY);
    horizonBand(x, P, W, hY, sx);
    sunBurst(x, P, W, hY, sx, sy, sunR);

    // 2. atmospheric haze high in the sky (behind everything)
    K.hazeSheet(x, W, Math.floor(hY * 1.1), noise, K.mix(P.sky2, P.glow, 0.3), 0.07, 460 + r() * 200, 'screen');

    // 4. far islands first (sit in the deep sea)
    islandsAndBirds(x, P, noise, W, H, hY, p.islands, false, r);

    // 5. the cloud sea, far→near
    cloudSea(x, P, W, H, hY, noise, r, sx);

    // 5b. melt the far cloud line into the dawn sky (kills the horizon seam)
    horizonFade(x, P, W, H, hY, sx, sy);

    // 5c. god-rays raking OVER the cloud tops (the visible volumetric shafts)
    if (p.godrays) godRays(x, P, W, H, hY, sx, sy, r);

    // 6. THE COLOSSUS breaching the sea — biased to the side opposite the sun
    //    so it reads as a dark mass against the dawn glow (not washed out).
    const cxMain = sx < W * 0.5 ? W * (0.52 + r() * 0.28) : W * (0.20 + r() * 0.28);
    const cMain = colossus(x, P, noise, W, H, hY, p.colossus, sx, sy, r, cxMain, 1);
    if (p.event === 'Twin Colossus') {
      const cx2 = cxMain < W * 0.5 ? W * (0.70 + r() * 0.15) : W * (0.15 + r() * 0.15);
      colossus(x, P, noise, W, H, hY, K.pick(COLOSSI, r), sx, sy, r, cx2, 0.55);
    }

    // 7. near clouds wrapping/occluding the colossus base + a foreground row
    {
      const sunDir = sx < W * 0.5 ? -1 : 1;
      // a cluster of puffs hugging the breach line in FRONT of the colossus
      const bw = W * 0.26;
      for (let i = 0; i < 7; i++) {
        const jx = cMain.cx + (r() - 0.5) * bw * 1.7;
        const jy = cMain.breachY + (r() - 0.2) * W * 0.04;
        puff(x, P, noise, jx, jy, W * (0.05 + r() * 0.045), r, 1, sunDir);
      }
      // full-width near foreground row
      const baseY = H * 0.94;
      const puffR = W * 0.105;
      let xx = -puffR;
      while (xx < W + puffR) {
        const jx = xx + (r() - 0.5) * puffR;
        const jy = baseY + (r() - 0.5) * puffR * 0.5;
        puff(x, P, noise, jx, jy, puffR * (0.85 + r() * 0.6), r, 1, sunDir);
        xx += puffR * (0.9 + r() * 0.4);
      }
    }

    // 8. birds for scale (over clouds)
    islandsAndBirds(x, P, noise, W, H, hY, 0, p.birds, r);

    // 9. atmospheric haze sweep + dawn mist
    haze(x, P, W, H, hY, noise, r);

    if (p.event === 'Aurora Veil') {
      x.save(); x.globalCompositeOperation = 'screen';
      for (let b = 0; b < 3; b++) {
        const baseX = r() * W;
        const gg = x.createLinearGradient(0, 0, 0, hY);
        gg.addColorStop(0, 'rgba(0,0,0,0)');
        gg.addColorStop(0.5, K.rgba(K.mix(P.cloudShad, P.glow, r()), 0.10));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gg;
        x.beginPath();
        for (let yy = 0; yy <= hY; yy += 10) { const xx = baseX + Math.sin(yy / 90 + b) * W * 0.06 + noise.fbm(yy / 100, b * 9, 3) * 60; x[yy ? 'lineTo' : 'moveTo'](xx, yy); }
        for (let yy = hY; yy >= 0; yy -= 10) { const xx = baseX + Math.sin(yy / 90 + b) * W * 0.06 + noise.fbm(yy / 100, b * 9, 3) * 60 + W * 0.05; x.lineTo(xx, yy); }
        x.closePath(); x.fill();
      }
      x.restore();
    }

    // 10. soft motes / light dust drifting in the dawn air
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) { const mx = r() * W, my = r() * H * 0.7; const s = 0.4 + r() * 1.8; x.fillStyle = K.rgba(r() < 0.4 ? P.sun : P.cloudLit, 0.05 + r() * 0.18); x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill(); }
    x.restore();

    // 11. finishing: gentle bloom from the sun, grain, soft vignette, top darken
    K.bloom(x, sx, sy, W * 0.5, P.glow, 0.05);
    K.grain(x, W, H, 620, r);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.22); x.restore();
    // gentle cool darken at very top for depth (keeps it luminous below)
    const tg = x.createLinearGradient(0, 0, 0, H * 0.4);
    tg.addColorStop(0, K.rgba(K.mix(P.deep, '#000', 0.25), 0.20)); tg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H * 0.4);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_cloudsea', draw, traits };
})();
