/* OVERCAST — clouds that behave as SOLIDS.
 * A heavy cloud rests on the ground with a clean hard bottom edge; a cloud
 * wedged between two hills; a cloud crated in rough timber; a cloud throwing a
 * sharp cast-shadow on a plain; a cloud sitting on a table; a flat cloud lid
 * pressed low over an empty plain. Storm light, sodium underglow at the horizon.
 * SURREAL = real-but-off: everything is a believable overcast landscape with
 * ONE law broken — vapour has mass, an edge, a shadow, a weight it should not.
 * Hazy + textured every frame. Nothing neon, nothing trippy.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six palettes — one storm-world family (slate / charcoal / grey-blue) each
     a different weather and a different temperature of sodium horizon glow. */
  const PALS = [
    { name: 'Sodium Dusk',  skyTop:'#2b313b', skyMid:'#454d59', skyLow:'#7c7c84', glow:'#c98a4e', earth:'#3b3a3c', earthLit:'#56524e', cloudHi:'#cdd2d8', cloudMid:'#8f97a1', cloudLow:'#4f5560', cloudCore:'#343a42', shadow:'rgba(22,24,28,0.55)', ink:'#1b1e24', timber:'#6b5238' },
    { name: 'Slate Squall',  skyTop:'#384350', skyMid:'#5b6470', skyLow:'#8b919a', glow:'#b9874f', earth:'#454a4f', earthLit:'#646a6d', cloudHi:'#d6dbe1', cloudMid:'#9aa3ad', cloudLow:'#5b6470', cloudCore:'#3a414b', shadow:'rgba(28,32,38,0.52)', ink:'#22272e', timber:'#5f4a34' },
    { name: 'Charcoal Front',skyTop:'#1d2127', skyMid:'#2e343c', skyLow:'#565c66', glow:'#a06b38', earth:'#2a2c30', earthLit:'#42433f', cloudHi:'#aeb6c0', cloudMid:'#717984', cloudLow:'#3f454e', cloudCore:'#23272e', shadow:'rgba(10,12,16,0.62)', ink:'#0f1216', timber:'#574027' },
    { name: 'Sodium Verge',  skyTop:'#323641', skyMid:'#525866', skyLow:'#9a8e84', glow:'#d39a5c', earth:'#4a443e', earthLit:'#6e6356', cloudHi:'#e0dcd4', cloudMid:'#a39b96', cloudLow:'#646169', cloudCore:'#3e3c40', shadow:'rgba(30,26,24,0.50)', ink:'#241f1d', timber:'#73583a' },
    { name: 'Cold Ceiling',  skyTop:'#3c454f', skyMid:'#5e6975', skyLow:'#97a0a8', glow:'#9ea7b0', earth:'#4c5258', earthLit:'#6a7076', cloudHi:'#dde2e7', cloudMid:'#a6aeb6', cloudLow:'#646b74', cloudCore:'#444b53', shadow:'rgba(34,40,46,0.48)', ink:'#272d33', timber:'#615036' },
    { name: 'Ember Slate',   skyTop:'#262a30', skyMid:'#3d434c', skyLow:'#6e6258', glow:'#c97f3c', earth:'#363230', earthLit:'#53493f', cloudHi:'#c2c6cc', cloudMid:'#868d96', cloudLow:'#4d525b', cloudCore:'#2e333a', shadow:'rgba(16,16,20,0.58)', ink:'#161413', timber:'#6a4e2f' },
  ];

  const MODES = ['Grounded', 'Crated', 'Wedged', 'Hard Shadow', 'On Table', 'Low Ceiling'];
  // landscape (1.5) and square, varied per seed
  const FORMATS = [[1280, 853], [1180, 1180], [1280, 853], [1100, 1100]];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);
    const pal = pickPal(r);
    // mode keyed off seed so the SET cycles through all six, plus rng for variety
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    const hz = H * (mode === 'Low Ceiling' ? (0.62 + r() * 0.18) : (0.50 + r() * 0.24));
    const sunSide = r() < 0.5 ? -1 : 1;             // which side the sodium glow sits
    const glowX = sunSide < 0 ? W * (0.10 + r() * 0.26) : W * (0.62 + r() * 0.28);

    // ── PER-OUTPUT LAYOUT RNG ──────────────────────────────────────────
    // Everything below is drawn from r() AFTER the four traits-shared draws
    // (pal, fmt, hz, sunSide) so traits() stays a pure mirror. These give every
    // output its OWN composition within its mode: where the mass sits, how big,
    // how tilted, how many secondary forms, where the light/camera lands. Two
    // outputs of the same mode must read as different pictures, not a recolor.
    const jit = (amt) => (r() - 0.5) * 2 * amt;     // symmetric jitter [-amt,amt]
    const rng = (lo, hi) => lo + r() * (hi - lo);   // uniform range
    const L = {
      // horizontal slide of the hero mass: full thirds travel, both directions
      heroDX: jit(W * 0.22),
      heroDY: jit(H * 0.07),
      heroScale: rng(0.78, 1.30),                   // overall hero size multiplier
      tilt: jit(0.10),                              // whole-mass lean (radians)
      // secondary scatter: distant solid-cloud forms parked on the horizon
      distantN: 1 + (r() * 4 | 0),
      distantSeed: r(),
      // camera/crop bias for the cloud's vertical perch
      perch: rng(-0.10, 0.14),
    };
    // distant scatter parameters baked now so order is stable for traits mirror
    const distant = [];
    for (let i = 0; i < L.distantN; i++) {
      distant.push({ tx: r(), w: rng(0.06, 0.20), h: rng(0.5, 1.1), lift: rng(-0.02, 0.05) });
    }

    // ============ SKY ============
    paintSky(x, W, H, hz, pal, glowX, noise, r);

    // distant brooding solid-cloud forms on the horizon (per-output scatter)
    drawDistantForms(x, W, H, hz, pal, distant, glowX, noise, r);

    // ============ GROUND / SET per mode ============
    // Returns the rect/anchor where the cloud should sit.
    let anchor;
    if (mode === 'Grounded')      anchor = groundPlane(x, W, H, hz, pal, glowX, r, noise);
    else if (mode === 'Crated')   anchor = groundPlane(x, W, H, hz, pal, glowX, r, noise);
    else if (mode === 'Wedged')   anchor = null; // self-contained below
    else if (mode === 'Hard Shadow') anchor = flatPlain(x, W, H, hz, pal, glowX, r, noise);
    else if (mode === 'On Table') anchor = tableScene(x, W, H, hz, pal, glowX, r, noise, L);
    else                          anchor = flatPlain(x, W, H, hz, pal, glowX, r, noise); // Low Ceiling

    // light direction from the glow
    const lightDir = glowX < W / 2 ? 1 : -1;

    // ============ THE CLOUD (solid) per mode ============
    if (mode === 'Grounded') {
      const cw = W * (0.30 + r() * 0.26) * L.heroScale, ch = cw * (0.36 + r() * 0.26);
      const cx = K.clamp(W * 0.5 + L.heroDX - lightDir * rng(0.0, 0.10) * W, cw * 0.45, W - cw * 0.45);
      const baseY = hz + (H - hz) * (0.02 + r() * 0.16) + L.heroDY;   // hard bottom rests on earth
      castShadow(x, cx, baseY, cw, pal, lightDir, 0.7 + r() * 0.35);
      solidCloud(x, cx, baseY, cw, ch, pal, lightDir, noise, r, { flatBottom: true, tilt: L.tilt });
    } else if (mode === 'Crated') {
      const cw = W * (0.24 + r() * 0.20) * L.heroScale;
      const ch = cw * (0.48 + r() * 0.34);
      const cx = K.clamp(W * 0.5 + L.heroDX, cw * 0.6, W - cw * 0.6);
      const baseY = hz + (H - hz) * (0.08 + r() * 0.26) + L.heroDY;
      const bulge = 0.62 + r() * 0.32;                 // how high cloud billows out of the crate
      const fill = 0.74 + r() * 0.20;                  // cloud width vs crate width
      castShadow(x, cx, baseY, cw * 1.05, pal, lightDir, 0.7 + r() * 0.3);
      crate(x, cx, baseY, cw, ch, pal, lightDir, r, 'back');
      solidCloud(x, cx, baseY - ch * bulge, cw * fill, ch * (0.52 + r() * 0.26), pal, lightDir, noise, r, { flatBottom: false, tilt: L.tilt });
      crate(x, cx, baseY, cw, ch, pal, lightDir, r, 'front');
    } else if (mode === 'Wedged') {
      wedgedScene(x, W, H, hz, pal, glowX, lightDir, noise, r, L);
    } else if (mode === 'Hard Shadow') {
      const cw = W * (0.20 + r() * 0.22) * L.heroScale, ch = cw * (0.40 + r() * 0.26);
      const cx = K.clamp(W * 0.5 + L.heroDX, cw * 0.5, W - cw * 0.5);
      const floatY = hz - (H - hz) * (0.12 + r() * 0.40) + L.heroDY;  // hovers over plain
      const lobes = cloudLobes(cx, floatY, cw, ch, r, {});  // build ONCE, share with shadow
      const groundY = hz + (H - hz) * (0.20 + r() * 0.48);
      const skew = 0.06 + r() * 0.28;                  // shadow throw distance / sun height
      hardCastShadow(x, lobes, cx, floatY, groundY, pal, lightDir, skew);
      solidCloud(x, cx, floatY, cw, ch, pal, lightDir, noise, r, { flatBottom: false, lobes, tilt: L.tilt });
    } else if (mode === 'On Table') {
      const cw = anchor.topW * (0.50 + r() * 0.28), ch = cw * (0.34 + r() * 0.26);
      const cx = anchor.cx + jit(anchor.topW * 0.10);
      const baseY = anchor.topY + anchor.topDepth * (0.05 + r() * 0.26);
      castShadowOnTable(x, cx, baseY, cw, anchor, pal, lightDir);
      solidCloud(x, cx, baseY, cw, ch, pal, lightDir, noise, r, { flatBottom: true, tilt: L.tilt });
    } else { // Low Ceiling — a flat slab of cloud pressed low, hard flat underside
      lowCeiling(x, W, H, hz, pal, lightDir, noise, r, L);
    }

    // ============ ATMOSPHERE & TEXTURE ============
    atmosphere(x, W, H, hz, pal, glowX, noise, r);

    return { aspect: W / H };
  }

  /* ---------- SKY ---------- */
  function paintSky(x, W, H, hz, pal, glowX, noise, r) {
    const g = x.createLinearGradient(0, 0, 0, hz + (H - hz) * 0.2);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, pal.skyMid);
    g.addColorStop(1, pal.skyLow);
    x.fillStyle = g; x.fillRect(0, 0, W, hz + 2);

    // soft turbulent overcast banding in the sky (fbm, low-contrast)
    x.save(); x.globalCompositeOperation = 'soft-light';
    const step = Math.max(4, Math.floor(Math.min(W, H) / 150));
    for (let yy = 0; yy < hz; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.fbm(xx / (W * 0.5), yy / (H * 0.6), 4, 0.55, 2.2);
        const a = K.clamp(Math.abs(n) * 0.28, 0, 0.3);
        const c = n > 0 ? pal.cloudHi : pal.cloudCore;
        x.fillStyle = K.rgba(c, a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();

    // distant brooding cloud BANK along the horizon (storm structure, low & dark)
    x.save();
    const bankY = hz - (H - hz) * (0.0) - H * (0.04 + r() * 0.06);
    const bn = 26;
    x.beginPath();
    x.moveTo(0, hz + 4);
    for (let i = 0; i <= bn; i++) {
      const px = (i / bn) * W;
      const lump = noise.fbm(px / (W * 0.10) + 17, 2.7, 4, 0.6, 2.3);
      x.lineTo(px, bankY - lump * H * 0.05 - H * 0.02);
    }
    x.lineTo(W, hz + 4); x.closePath();
    const bg2 = x.createLinearGradient(0, bankY - H * 0.1, 0, hz);
    bg2.addColorStop(0, K.rgba(K.mix(pal.cloudLow, pal.skyMid, 0.4), 0.55));
    bg2.addColorStop(1, K.rgba(K.mix(pal.cloudCore, pal.glow, 0.2), 0.7));
    x.fillStyle = bg2; x.fill();
    x.restore();

    // sodium underglow at the horizon — warm band hugging the skyline
    const gy0 = hz - (H * 0.22), gy1 = hz + (H * 0.02);
    const gg = x.createLinearGradient(0, gy0, 0, gy1);
    gg.addColorStop(0, K.rgba(pal.glow, 0));
    gg.addColorStop(0.7, K.rgba(pal.glow, 0.28));
    gg.addColorStop(1, K.rgba(pal.glow, 0.46));
    x.save(); x.globalCompositeOperation = 'screen';
    x.fillStyle = gg; x.fillRect(0, gy0, W, gy1 - gy0);
    // a concentrated bloom where the sun would be behind the murk
    K.bloom(x, glowX, hz - H * 0.02, Math.min(W, H) * 0.5, pal.glow, 0.34);
    x.restore();
  }

  /* ---------- DISTANT SOLID-CLOUD SCATTER ---------- */
  // Small dark solid-cloud forms parked along the horizon — believable storm
  // structure, seeded per output so the backdrop never repeats. Drawn after the
  // sky, before the ground, so the ground haze settles them into the distance.
  function drawDistantForms(x, W, H, hz, pal, distant, glowX, noise, r) {
    if (!distant || !distant.length) return;
    const lightDir = glowX < W / 2 ? 1 : -1;
    x.save();
    distant.forEach((d) => {
      const dcx = d.tx * W;
      const dw = W * d.w;
      const dh = dw * (0.30 + d.h * 0.22);
      const dy = hz - dh * (0.10 + d.lift * 4);
      const lobes = [];
      const ln = 3 + (r() * 3 | 0);
      for (let i = 0; i < ln; i++) {
        const t = i / (ln - 1);
        const arc = Math.sin(t * Math.PI);
        lobes.push([dcx - dw / 2 + t * dw, dy - dh * (0.2 + arc * 0.5), dh * (0.4 + arc * 0.3)]);
      }
      x.beginPath();
      for (const [px, py, rad] of lobes) { x.moveTo(px + rad, py); x.arc(px, py, rad, 0, Math.PI * 2); }
      const g = x.createLinearGradient(0, dy - dh, 0, dy);
      g.addColorStop(0, K.rgba(K.mix(pal.cloudLow, pal.skyMid, 0.5), 0.42));
      g.addColorStop(1, K.rgba(K.mix(pal.cloudCore, lightDir > 0 ? pal.glow : pal.ink, 0.25), 0.5));
      x.fillStyle = g; x.fill();
    });
    x.restore();
  }

  /* ---------- GROUND VARIANTS ---------- */
  function groundPlane(x, W, H, hz, pal, glowX, r, noise) {
    // textured earth plane receding to horizon
    const g = x.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, K.mix(pal.earth, pal.glow, 0.16));
    g.addColorStop(0.4, pal.earthLit);
    g.addColorStop(1, pal.earth);
    x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
    // faint furrow lines for scale (perspective)
    x.save(); x.strokeStyle = K.rgba(pal.ink, 0.10); x.lineWidth = 1.2;
    for (let i = 1; i <= 9; i++) { const t = i / 10, yy = hz + (H - hz) * t * t; x.globalAlpha = 0.5 * (1 - t) + 0.08; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    x.restore();
    groundDust(x, W, H, hz, pal, noise);
    K.mottle(x, 0, hz, W, H - hz, pal.earth, 60, r, 'overlay');
    return { hz };
  }

  function flatPlain(x, W, H, hz, pal, glowX, r, noise) {
    const g = x.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, K.mix(pal.earthLit, pal.glow, 0.2));
    g.addColorStop(0.5, pal.earthLit);
    g.addColorStop(1, K.mix(pal.earth, pal.ink, 0.2));
    x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
    groundDust(x, W, H, hz, pal, noise);
    K.mottle(x, 0, hz, W, H - hz, pal.earthLit, 80, r, 'overlay');
    return { hz };
  }

  // WEDGED — a cloud crammed into the V between two hills. Draw order is the
  // whole trick: plain → hills → cloud → REDRAW the inner hill slopes on top of
  // the cloud's lower flanks, so the hills visibly pinch/clip the soft mass.
  function wedgedScene(x, W, H, hz, pal, glowX, lightDir, noise, r, L) {
    L = L || {};
    // raise the horizon for this mode so the hills have room and the cloud reads
    hz = H * (0.58 + r() * 0.16);
    flatPlain(x, W, H, hz, pal, glowX, r, noise);
    const gapX = K.clamp(W * 0.5 + (L.heroDX || 0) * 0.6, W * 0.28, W * 0.72);
    const peakL = (H - hz) * (0.50 + r() * 0.40);          // left hill height
    const peakR = (H - hz) * (0.50 + r() * 0.40);          // right hill height (independent)
    const peakH = Math.max(peakL, peakR);
    const leftPeakX = gapX - W * (0.20 + r() * 0.14);
    const rightPeakX = gapX + W * (0.20 + r() * 0.14);
    const valleyY = hz - peakH * (0.34 + r() * 0.22);      // notch height varies
    const valleyW = W * (0.12 + r() * 0.12);               // gap width varies wide

    // build a hill polygon; returns its path so we can re-stroke/clip it
    function hillPath(peakX, dir, ph) {
      const innerX = gapX - dir * valleyW * 0.5;
      x.beginPath();
      x.moveTo(dir < 0 ? -10 : W + 10, hz + 4);
      x.lineTo(dir < 0 ? -10 : W + 10, hz - ph * 0.5);
      x.quadraticCurveTo(peakX - dir * W * 0.05, hz - ph * 1.04, peakX, hz - ph);
      // slope down into the valley notch
      x.quadraticCurveTo(gapX - dir * W * 0.03, valleyY - ph * 0.02, innerX, valleyY);
      x.lineTo(innerX, hz + 4);
      x.closePath();
    }
    function paintHill(peakX, dir, ph) {
      hillPath(peakX, dir, ph);
      const litSide = (glowX < W / 2) === (dir < 0);
      const hg = x.createLinearGradient(0, hz - ph, 0, hz);
      hg.addColorStop(0, K.mix(pal.earthLit, litSide ? pal.glow : pal.ink, litSide ? 0.26 : 0.22));
      hg.addColorStop(0.6, K.mix(pal.earth, pal.ink, 0.18));
      hg.addColorStop(1, K.mix(pal.earth, pal.ink, 0.34));
      x.fillStyle = hg; x.fill();
      x.save(); x.clip();
      K.mottle(x, peakX - W * 0.3, hz - ph, W * 0.6, ph, pal.earth, 44, r, 'overlay');
      // ridge sodium catch on the lit slope
      if (litSide) { x.strokeStyle = K.rgba(pal.glow, 0.22); x.lineWidth = 3; hillPath(peakX, dir, ph); x.stroke(); }
      x.restore();
    }

    // 1. both hills (back)
    paintHill(leftPeakX, -1, peakL);
    paintHill(rightPeakX, 1, peakR);

    // 2. the cloud, jammed down into the notch — wider than the gap so it bulges
    //    over the shoulders, belly nested in the V (not hanging through it).
    const cw = valleyW * (1.5 + r() * 0.9);                 // bulge width varies wide
    const ch = cw * (0.5 + r() * 0.26);
    const cy = valleyY + ch * (0.06 + r() * 0.20);          // belly depth into the V varies
    // clip the cloud so it cannot spill below the valley floor into open air
    x.save();
    x.beginPath(); x.rect(0, 0, W, valleyY + ch * 0.20); x.clip();
    solidCloud(x, gapX, cy, cw, ch, pal, lightDir, noise, r, { flatBottom: false });
    x.restore();

    // 3. contact darkening where cloud meets each slope (pinch shadow)
    x.save(); x.globalCompositeOperation = 'multiply';
    [[-1, leftPeakX], [1, rightPeakX]].forEach(([dir, peakX]) => {
      const innerX = gapX - dir * valleyW * 0.5;
      const sg = x.createRadialGradient(innerX, valleyY + ch * 0.1, 0, innerX, valleyY + ch * 0.1, cw * 0.4);
      sg.addColorStop(0, K.rgba(pal.ink, 0.4)); sg.addColorStop(1, K.rgba(pal.ink, 0));
      x.fillStyle = sg; x.beginPath(); x.arc(innerX, valleyY + ch * 0.1, cw * 0.4, 0, 7); x.fill();
    });
    x.restore();

    // 4. REDRAW inner hill slopes over the cloud's lower flanks → the pinch
    paintHill(leftPeakX, -1, peakL);
    paintHill(rightPeakX, 1, peakR);
  }

  function tableScene(x, W, H, hz, pal, glowX, r, noise, L) {
    L = L || {};
    flatPlain(x, W, H, hz, pal, glowX, r, noise);
    // a plain wooden table standing on the plain, top in mild perspective
    const cx = K.clamp(W * 0.5 + (L.heroDX || 0) * 0.7 + (r() - 0.5) * W * 0.08, W * 0.30, W * 0.70);
    const topW = W * (0.36 + r() * 0.26);
    const topY = hz + (H - hz) * (0.08 + r() * 0.22);
    const topDepth = topW * (0.11 + r() * 0.12);           // perspective depth varies
    const topThick = (H - hz) * 0.045;
    const legH = H - topY - topThick - (H - hz) * 0.04;
    const lightDir = glowX < W / 2 ? 1 : -1;
    // legs
    const lw = topW * 0.05;
    x.fillStyle = K.mix(pal.timber, pal.ink, 0.35);
    [[cx - topW * 0.42, topY + topThick], [cx + topW * 0.42 - lw, topY + topThick]].forEach(([lx, ly]) => {
      x.fillRect(lx, ly, lw, legH);
    });
    // back legs (slightly inset, darker)
    x.fillStyle = K.mix(pal.timber, pal.ink, 0.55);
    [[cx - topW * 0.34, topY], [cx + topW * 0.34 - lw, topY]].forEach(([lx, ly]) => {
      x.fillRect(lx, ly - topDepth * 0.2, lw, legH * 0.7);
    });
    // table top (parallelogram, front edge + top face)
    x.fillStyle = K.mix(pal.timber, '#000', 0.18);
    x.fillRect(cx - topW / 2, topY, topW, topThick); // front edge band
    x.beginPath(); // top face receding back
    x.moveTo(cx - topW / 2, topY);
    x.lineTo(cx + topW / 2, topY);
    x.lineTo(cx + topW / 2 - topDepth, topY - topDepth * 0.55);
    x.lineTo(cx - topW / 2 - topDepth, topY - topDepth * 0.55);
    x.closePath();
    const tg = x.createLinearGradient(0, topY - topDepth, 0, topY);
    tg.addColorStop(0, K.mix(pal.timber, lightDir > 0 ? pal.glow : '#fff', 0.18));
    tg.addColorStop(1, pal.timber);
    x.fillStyle = tg; x.fill();
    // wood grain
    woodGrain(x, cx - topW / 2 - topDepth, topY - topDepth * 0.55, topW, topDepth * 0.55 + topThick, pal, r);
    return { hz, cx, topW, topY, topDepth, topThick };
  }

  /* ---------- THE SOLID CLOUD ---------- */
  // Build a billowy cloud silhouette from a chain of lobes, optionally with a
  // hard flat bottom (resting/cut) — then shade it volumetrically so it reads
  // as a HEAVY object, not vapour.
  function cloudLobes(cx, cy, cw, ch, r, opts) {
    opts = opts || {};
    const lobes = [];
    const n = 5 + (r() * 6 | 0);                          // crown lobe count varies wide
    const skewT = (r() - 0.5) * 0.5;                       // mass leans left/right (asymmetry)
    const crownLift = 0.30 + r() * 0.22;                  // how tall the crown rides
    const rough = 0.06 + r() * 0.18;                       // per-lobe radius jitter amount
    // main mass: heavily overlapping circles along an arched top (fuse into one mass)
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const px = cx - cw / 2 + t * cw + skewT * cw * (t - 0.5);
      const arc = Math.pow(Math.sin(t * Math.PI), 0.6 + r() * 0.3);
      const py = cy - ch * (crownLift + arc * (0.34 + r() * 0.18));
      let rad = ch * (0.38 + arc * 0.34 + r() * rough);    // bigger radii → smooth union
      if (opts.squeeze) rad = Math.min(rad, opts.squeeze * 0.30);
      lobes.push([px, py, rad]);
    }
    // billow puffs riding the crown — count + placement seeded per output
    const extra = 2 + (r() * 5 | 0);
    for (let i = 0; i < extra; i++) {
      const t = 0.10 + r() * 0.8;
      const px = cx - cw / 2 + t * cw;
      const arc = Math.sin(t * Math.PI);
      const py = cy - ch * (0.50 + arc * (0.20 + r() * 0.22) + r() * 0.16);
      lobes.push([px, py, ch * (0.18 + r() * 0.22)]);
    }
    // continuous base row: guarantees an unbroken belly across the full width
    // (so a resting/flat-bottom cloud has NO notch where two crown lobes part)
    const base = 4 + (n | 0);
    for (let i = 0; i <= base; i++) {
      const t = i / base;
      const px = cx - cw * 0.46 + t * cw * 0.92;
      const edge = Math.sin(t * Math.PI);                  // taper at the ends
      const rad = ch * (0.20 + edge * (0.12 + r() * 0.10));
      lobes.push([px, cy - rad * 0.55, rad]);              // bottoms sit just below cy
    }
    return lobes;
  }

  function solidCloud(x, cx, cy, cw, ch, pal, lightDir, noise, r, opts) {
    opts = opts || {};
    const lobes = opts.lobes || cloudLobes(cx, cy, cw, ch, r, opts);
    const topMost = Math.min(...lobes.map((l) => l[1] - l[2]));
    // gentle whole-mass lean. A resting/flat-bottom cloud stays level (its cut is
    // a real horizontal set-down edge); floating masses may tilt.
    const tilt = opts.flatBottom ? 0 : (opts.tilt || 0);
    let _restore = false;
    if (tilt) { x.save(); x.translate(cx, cy); x.rotate(tilt); x.translate(-cx, -cy); _restore = true; }

    // ---- 1. build the silhouette path (union of lobes) ----
    function silhouette() {
      x.beginPath();
      for (const [px, py, rad] of lobes) x.moveTo(px + rad, py), x.arc(px, py, rad, 0, Math.PI * 2);
    }

    // For a believable union we draw onto an offscreen by filling all lobes,
    // then a flat-bottom clip if requested. Use 'destination' tricks via clip.
    x.save();
    // clip to the cloud body (union of lobes)
    silhouette();
    x.clip();
    // for a resting cloud, intersect with the half-plane above the resting line
    // so the belly becomes one hard horizontal cut edge
    if (opts.flatBottom) {
      x.beginPath();
      x.rect(0, 0, x.canvas.width, cy);
      x.clip();
    }

    // gradient body: lit crown (top) -> heavy dark belly (bottom)
    const bg = x.createLinearGradient(0, topMost, 0, cy);
    bg.addColorStop(0, pal.cloudHi);
    bg.addColorStop(0.32, pal.cloudMid);
    bg.addColorStop(0.7, pal.cloudLow);
    bg.addColorStop(1, pal.cloudCore);
    x.fillStyle = bg;
    x.fillRect(cx - cw, topMost - ch, cw * 2, ch * 2.2);

    // directional light wash from the glow side (warm rim lighting, lit flank)
    const lg = x.createLinearGradient(cx - lightDir * cw * 0.55, 0, cx + lightDir * cw * 0.55, 0);
    lg.addColorStop(0, K.rgba(pal.glow, 0.20));
    lg.addColorStop(0.5, K.rgba(pal.glow, 0.04));
    lg.addColorStop(1, K.rgba(pal.cloudCore, 0.10));
    x.save(); x.globalCompositeOperation = 'soft-light';
    x.fillStyle = lg; x.fillRect(cx - cw, topMost - ch, cw * 2, ch * 2.4);
    x.restore();

    // ---- noise-driven volumetric shading: fused billow, NO circle seams ----
    // sample fbm across the body. Light from upper-glow side; the field gives
    // mottled cumulus turbulence with self-shadowed pockets and lit ridges.
    const left = cx - cw * 0.7, right = cx + cw * 0.7;
    const top = topMost - ch * 0.1, bottomY = cy + ch * 0.1;
    const cell = Math.max(3, Math.floor(Math.min(cw, ch) / 90));
    const sc = Math.min(cw, ch) / 2.2;
    x.save();
    for (let yy = top; yy < bottomY; yy += cell) {
      for (let xx = left; xx < right; xx += cell) {
        // turbulence value with a light-facing bias
        let nf = noise.fbm(xx / sc + 11, yy / sc + 5, 5, 0.55, 2.2);
        // light gradient: top-lit-side bright, lower-far-side dark
        const lx = (xx - cx) * lightDir / (cw * 0.5);     // -1..1, +1 = lit
        const ly = (yy - top) / (bottomY - top);          // 0 top..1 bottom
        const lightTerm = 0.55 * lx - 1.15 * ly + 0.35;   // tilt the shading
        let v = lightTerm + nf * 0.55;                    // combine
        v = K.clamp((v + 1) / 2, 0, 1);
        // map to a 4-stop cloud ramp
        let col;
        if (v > 0.72) col = K.mix(pal.cloudHi, '#ffffff', (v - 0.72) / 0.28 * 0.25);
        else if (v > 0.48) col = K.mix(pal.cloudMid, pal.cloudHi, (v - 0.48) / 0.24);
        else if (v > 0.26) col = K.mix(pal.cloudLow, pal.cloudMid, (v - 0.26) / 0.22);
        else col = K.mix(pal.cloudCore, pal.cloudLow, v / 0.26);
        x.fillStyle = col;
        x.fillRect(xx, yy, cell + 1, cell + 1);
      }
    }
    x.restore();

    // warm sodium kiss on the lit upper rim
    x.save(); x.globalCompositeOperation = 'screen';
    const kx = cx - lightDir * cw * 0.34, ky = topMost + ch * 0.28;
    const kg = x.createRadialGradient(kx, ky, ch * 0.05, kx, ky, cw * 0.55);
    kg.addColorStop(0, K.rgba(K.mix(pal.cloudHi, pal.glow, 0.4), 0.34));
    kg.addColorStop(1, K.rgba(pal.glow, 0));
    x.fillStyle = kg; x.fillRect(cx - cw, top, cw * 2, ch * 1.5);
    x.restore();

    // heavy belly: deep AO toward the bottom edge (sells the WEIGHT)
    const ag = x.createLinearGradient(0, cy - ch * 0.5, 0, cy);
    ag.addColorStop(0, K.rgba(pal.cloudCore, 0));
    ag.addColorStop(1, K.rgba(pal.ink, opts.flatBottom ? 0.55 : 0.4));
    x.save(); x.globalCompositeOperation = 'multiply';
    x.fillStyle = ag; x.fillRect(cx - cw, cy - ch * 0.5, cw * 2, ch * 0.6);
    x.restore();

    // fine surface mottle so it isn't clean vector
    K.mottle(x, cx - cw, topMost - ch * 0.3, cw * 2, ch * 1.6, pal.cloudMid, 28, r, 'overlay');

    x.restore(); // un-clip

    // ---- the HARD EDGE — the broken law ----
    if (opts.flatBottom) {
      // a vapour mass does not have a flat machined underside. We give it one:
      // a thin dark band of self-shadow hugging the cut, then a crisp ink line,
      // so the eye reads a SOLID object that's been set down or sliced.
      let exL = cx, exR = cx;
      for (const [px, py, rad] of lobes) {
        if (py - rad < cy) { exL = Math.min(exL, px - rad * 0.95); exR = Math.max(exR, px + rad * 0.95); }
      }
      x.save();
      // dark self-shadow band just inside the belly, clipped to the body
      silhouette(); x.clip(); x.beginPath(); x.rect(0, 0, x.canvas.width, cy); x.clip();
      const bb = x.createLinearGradient(0, cy - ch * 0.22, 0, cy);
      bb.addColorStop(0, K.rgba(pal.ink, 0)); bb.addColorStop(1, K.rgba(pal.ink, 0.42));
      x.fillStyle = bb; x.fillRect(exL, cy - ch * 0.22, exR - exL, ch * 0.22);
      x.restore();
      // crisp ink cut line
      x.save();
      x.fillStyle = K.rgba(pal.ink, 0.7);
      x.fillRect(exL, cy - 1.5, exR - exL, 3);
      x.restore();
    }

    if (_restore) x.restore(); // un-tilt the mass
  }

  /* ---------- CRATE ---------- */
  function crate(x, cx, baseY, cw, ch, pal, lightDir, r, part) {
    const left = cx - cw / 2, right = cx + cw / 2, top = baseY - ch, bot = baseY;
    const depth = cw * 0.16;
    const slat = K.mix(pal.timber, pal.ink, 0.1);
    const slatLit = K.mix(pal.timber, pal.glow, 0.22);
    const slatDk = K.mix(pal.timber, pal.ink, 0.45);
    if (part === 'back') {
      // back wall + far rim (so cloud bulges in front of it)
      x.fillStyle = slatDk;
      x.beginPath();
      x.moveTo(left, top); x.lineTo(right, top);
      x.lineTo(right - depth, top - depth * 0.5); x.lineTo(left - depth, top - depth * 0.5);
      x.closePath(); x.fill(); // top-back rim
      // inside back face (dark)
      x.fillStyle = K.mix(pal.timber, pal.ink, 0.6);
      x.fillRect(left, top, cw, ch * 0.5);
      return;
    }
    // FRONT: front plank wall with horizontal slats + gaps + side face
    // side face (shaded, perspective)
    x.fillStyle = slatDk;
    x.beginPath();
    x.moveTo(right, top); x.lineTo(right - depth, top - depth * 0.5);
    x.lineTo(right - depth, bot - depth * 0.5); x.lineTo(right, bot);
    x.closePath(); x.fill();
    // front face slats
    const nSlat = 4;
    for (let i = 0; i < nSlat; i++) {
      const sy = top + (ch / nSlat) * i + ch * 0.02;
      const sh = (ch / nSlat) * 0.78;
      const sg = x.createLinearGradient(left, 0, right, 0);
      sg.addColorStop(0, lightDir > 0 ? slatLit : slatDk);
      sg.addColorStop(0.5, slat);
      sg.addColorStop(1, lightDir > 0 ? slatDk : slatLit);
      x.fillStyle = sg; x.fillRect(left, sy, cw, sh);
      // gap shadow above slat
      x.fillStyle = K.rgba(pal.ink, 0.4); x.fillRect(left, sy - ch * 0.02, cw, ch * 0.02);
      woodGrain(x, left, sy, cw, sh, pal, r);
    }
    // corner posts
    x.fillStyle = K.mix(pal.timber, pal.ink, 0.2);
    x.fillRect(left - cw * 0.015, top, cw * 0.045, ch);
    x.fillRect(right - cw * 0.03, top, cw * 0.045, ch);
    // crisp outline
    x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = 1.6;
    x.strokeRect(left, top, cw, ch);
  }

  function woodGrain(x, gx, gy, gw, gh, pal, r) {
    x.save(); x.globalCompositeOperation = 'overlay';
    const n = 3 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const yy = gy + r() * gh;
      x.strokeStyle = K.rgba(r() < 0.5 ? '#000' : pal.glow, 0.06 + r() * 0.06);
      x.lineWidth = 0.8 + r();
      x.beginPath(); x.moveTo(gx, yy);
      x.bezierCurveTo(gx + gw * 0.33, yy + (r() - 0.5) * gh * 0.2, gx + gw * 0.66, yy + (r() - 0.5) * gh * 0.2, gx + gw, yy);
      x.stroke();
    }
    x.restore();
  }

  /* ---------- SHADOWS ---------- */
  function castShadow(x, cx, baseY, cw, pal, lightDir, strength) {
    // soft elliptical contact shadow on the ground under a resting cloud
    x.save();
    const sg = x.createRadialGradient(cx, baseY, 0, cx, baseY, cw * 0.7);
    sg.addColorStop(0, K.rgba(pal.ink, 0.5 * strength));
    sg.addColorStop(0.5, K.rgba(pal.ink, 0.28 * strength));
    sg.addColorStop(1, K.rgba(pal.ink, 0));
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = sg;
    x.translate(cx + lightDir * cw * 0.18, baseY);
    x.scale(1, 0.26);
    x.beginPath(); x.arc(0, 0, cw * 0.7, 0, 7); x.fill();
    x.restore();
  }

  function castShadowOnTable(x, cx, baseY, cw, anchor, pal, lightDir) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const sg = x.createRadialGradient(cx, baseY, 0, cx, baseY, cw * 0.6);
    sg.addColorStop(0, K.rgba(pal.ink, 0.42));
    sg.addColorStop(1, K.rgba(pal.ink, 0));
    x.fillStyle = sg;
    x.translate(cx + lightDir * cw * 0.2, baseY);
    x.scale(1, 0.22); x.beginPath(); x.arc(0, 0, cw * 0.6, 0, 7); x.fill();
    x.restore();
  }

  // The signature uncanny one: a HARD, sharp-edged shadow that clearly shares
  // the CLOUD'S OWN silhouette, lying flat on the plain (impossible for vapour).
  function hardCastShadow(x, lobes, cx, floatY, groundY, pal, lightDir, skew) {
    // map the cloud's lobes onto the ground: keep horizontal shape (the cloud's
    // outline), flatten vertically, and skew away from the light. One union fill
    // = one clean cloud-shaped patch, no internal arcs because all lobes share
    // the same fill so overlaps merge.
    const flatten = 0.30;                 // vertical squash → ground projection
    const throwAmt = skew == null ? 0.18 : skew; // shadow throw distance / sun height
    function shape(scale) {
      x.beginPath();
      for (const [px, py, rad] of lobes) {
        // each lobe's horizontal offset preserved; project down to groundY,
        // skewed proportionally to the cloud's height above the plain
        const gx = cx + (px - cx) * 1.0 + lightDir * (groundY - floatY) * throwAmt;
        const ry = rad * flatten * scale;
        x.moveTo(gx + rad * scale, groundY);
        x.ellipse(gx, groundY, rad * scale, ry, 0, 0, Math.PI * 2);
      }
      x.closePath();
    }
    // ONE flat solid fill = a clean, sharp cloud-shaped patch. A single fill of
    // all overlapping ellipse subpaths merges into one region (nonzero winding),
    // so there are NO internal seams. We do NOT stroke per-lobe (that would draw
    // concentric ellipse outlines); the hard edge comes from the opaque fill
    // plus a slightly darker, slightly inset second fill for an edge bite.
    x.save(); x.globalCompositeOperation = 'multiply';
    x.fillStyle = K.rgba(pal.ink, 0.5); shape(1.0); x.fill();
    x.restore();
  }

  /* ---------- LOW CEILING ---------- */
  function lowCeiling(x, W, H, hz, pal, lightDir, noise, r, L) {
    L = L || {};
    // a flat slab of cloud forms a low LID pressed over the plain: dead-flat
    // hard underside, lumpy billowed top fading up into the bright sky.
    const lidY = H * (0.30 + r() * 0.26) + (L.heroDY || 0); // underside of the lid varies wide
    const slabTop = lidY - H * (0.12 + r() * 0.16);        // slab thickness varies

    // build the slab silhouette: flat bottom edge, billowed top profile
    const cols = 90;
    const phase = r() * 40;                                // per-output horizontal phase
    const lumpScale = 0.10 + r() * 0.16;                   // top-edge roughness varies
    const slant = (r() - 0.5) * H * 0.10;                  // slab can ramp left↔right
    const topProfile = [];
    for (let i = 0; i <= cols; i++) {
      const px = (i / cols) * W;
      const lump = noise.fbm(px / (W * lumpScale) + phase, 4.1, 4, 0.6, 2.2);
      topProfile.push(slabTop - lump * H * 0.06 + (i / cols - 0.5) * slant);
    }
    x.save();
    x.beginPath();
    x.moveTo(0, lidY);
    x.lineTo(W, lidY);
    for (let i = cols; i >= 0; i--) x.lineTo((i / cols) * W, topProfile[i]);
    x.closePath();
    x.clip();

    // volumetric fill: bright crown up top, heavy dark flat belly at lidY
    const cell = Math.max(3, Math.floor(W / 220));
    const sc = W / 5;
    for (let yy = slabTop - H * 0.08; yy < lidY; yy += cell) {
      for (let xx = 0; xx < W; xx += cell) {
        let nf = noise.fbm(xx / sc + 30, yy / (sc * 0.7) + 9, 5, 0.55, 2.2);
        const ly = (yy - (slabTop - H * 0.08)) / (lidY - (slabTop - H * 0.08));
        let v = K.clamp((-1.25 * ly + 0.55 + nf * 0.5 + 1) / 2, 0, 1);
        let col;
        if (v > 0.66) col = K.mix(pal.cloudHi, '#ffffff', (v - 0.66) / 0.34 * 0.2);
        else if (v > 0.42) col = K.mix(pal.cloudMid, pal.cloudHi, (v - 0.42) / 0.24);
        else if (v > 0.22) col = K.mix(pal.cloudLow, pal.cloudMid, (v - 0.22) / 0.20);
        else col = K.mix(pal.cloudCore, pal.cloudLow, v / 0.22);
        x.fillStyle = col; x.fillRect(xx, yy, cell + 1, cell + 1);
      }
    }
    // warm sodium grazing the lit end of the underside
    x.save(); x.globalCompositeOperation = 'screen';
    const kx = lightDir > 0 ? W * 0.2 : W * 0.8;
    const kg = x.createRadialGradient(kx, lidY - H * 0.04, 0, kx, lidY - H * 0.04, W * 0.4);
    kg.addColorStop(0, K.rgba(pal.glow, 0.18)); kg.addColorStop(1, K.rgba(pal.glow, 0));
    x.fillStyle = kg; x.fillRect(0, slabTop - H * 0.1, W, lidY - slabTop + H * 0.1);
    x.restore();
    K.mottle(x, 0, slabTop - H * 0.08, W, lidY - slabTop + H * 0.08, pal.cloudLow, 30, r, 'overlay');
    x.restore();

    // HARD flat underside edge: crisp cut line + AO falloff onto the air below
    x.fillStyle = K.rgba(pal.ink, 0.55); x.fillRect(0, lidY - 1.5, W, 3);
    const ug = x.createLinearGradient(0, lidY, 0, lidY + H * 0.14);
    ug.addColorStop(0, K.rgba(pal.ink, 0.34)); ug.addColorStop(1, K.rgba(pal.ink, 0));
    x.save(); x.globalCompositeOperation = 'multiply';
    x.fillStyle = ug; x.fillRect(0, lidY, W, H * 0.14);
    x.restore();
  }

  /* ---------- shared ground dust + atmosphere ---------- */
  function groundDust(x, W, H, hz, pal, noise) {
    const gh = x.createLinearGradient(0, hz - H * 0.03, 0, hz + H * 0.10);
    const hazeCol = K.mix(pal.skyLow, pal.glow, 0.3);
    gh.addColorStop(0, K.rgba(hazeCol, 0));
    gh.addColorStop(0.45, K.rgba(hazeCol, 0.4));
    gh.addColorStop(1, K.rgba(hazeCol, 0));
    x.save(); x.globalCompositeOperation = 'screen';
    x.fillStyle = gh; x.fillRect(0, hz - H * 0.03, W, H * 0.13);
    x.restore();
  }

  function atmosphere(x, W, H, hz, pal, glowX, noise, r) {
    // volumetric haze sheet (cool, settling the whole frame in air)
    const hazeCol = K.mix(pal.skyMid, pal.cloudHi, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.18, Math.min(W, H) * 0.85, 'screen');
    // a second warm haze hugging the horizon glow
    K.hazeSheet(x, W, H, K.makeNoise(7), K.mix(pal.glow, pal.skyLow, 0.4), 0.08, Math.min(W, H) * 1.2, 'screen');
    // film grain
    K.grain(x, W, H, 5.2, r);
    // vignette to seat it
    const dark = K.lum(pal.skyTop) < 0.2;
    K.vignette(x, W, H, dark ? 0.5 : 0.38);
  }

  /* ---------- TRAITS (pure, mirrors draw() rng order) ---------- */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : 'Square';
    // next rng draws in draw(): hz, sunSide
    const _hz = r();
    const sunSide = r() < 0.5 ? 'West' : 'East';
    const glowMap = { 'Sodium Dusk': 'Sodium', 'Slate Squall': 'Sodium', 'Charcoal Front': 'Sodium', 'Sodium Verge': 'Sodium', 'Cold Ceiling': 'Cold', 'Ember Slate': 'Ember' };
    return { Palette: pal.name, Mode: mode, Format: f, Glow: glowMap[pal.name], Light: sunSide };
  }

  return { name: 'h4_overcast', draw, traits };
})();
