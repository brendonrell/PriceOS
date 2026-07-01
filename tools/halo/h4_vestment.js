/* VESTMENT — formal clothing worn by no one.
 * SURREAL = real-but-off: an empty coat holds its own shoulders, a dress is
 * caught mid-stride, a shirt's chest is filled by nothing on a line, a suit
 * sits in an absent chair, a hat floats at head height — alone in a quiet
 * misty field. Each garment casts the long raking shadow of a WHOLE PERSON,
 * though no body is there. Magritte stillness, dignified, calm, uncanny —
 * never spooky, never horror.
 *
 * Palette world: deep loden/forest green, oxblood lining, bone/ivory cloth,
 * cool grey mist, charcoal shadow — a rich green-and-red world.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six bespoke palettes — all loden-green / oxblood / bone / grey-mist /
     charcoal, each a different hour & weather so the SET reads varied, never
     one look reskinned.
     sky/hzc = misty field above/at horizon; ground = the plain;
     cloth = garment body; clothHi = lit face; clothLo = shade face;
     lining = oxblood/red inner reveal; shadow = long person-shadow;
     glow = the low light behind the mist; ink = darkest accents. */
  const PALS = [
    { name: 'Loden Field',   sky:'#c9cdc2', hzc:'#d7d8cd', ground:'#9aa39a', cloth:'#2f3d2e', clothHi:'#4f5e44', clothLo:'#1c241a', lining:'#7a2e2a', shadow:'#1c1f1a', glow:'#e8e4cf', ink:'#141812' },
    { name: 'Oxblood Dusk',  sky:'#b6a8a0', hzc:'#caa39a', ground:'#8d8079', cloth:'#5a2723', clothHi:'#8a4038', clothLo:'#2c1310', lining:'#3a4a33', shadow:'#241317', glow:'#edcdb6', ink:'#180c0c' },
    { name: 'Bone Vespers',  sky:'#dcd8c9', hzc:'#e6e0cf', ground:'#bdb6a3', cloth:'#e6dcc8', clothHi:'#f4eede', clothLo:'#a89c80', lining:'#7a2e2a', shadow:'#564b3f', glow:'#fbf4dd', ink:'#46402f' },
    { name: 'Slate Sacristy',sky:'#b3bbb8', hzc:'#c2c9c4', ground:'#8b938f', cloth:'#37413a', clothHi:'#586056', clothLo:'#202722', lining:'#6e2f30', shadow:'#1a201c', glow:'#dfe3da', ink:'#10140f' },
    { name: 'Forest Compline',sky:'#7e8a7e', hzc:'#93a08f', ground:'#5e6960', cloth:'#243024', clothHi:'#3e4c38', clothLo:'#121a12', lining:'#822f2a', shadow:'#0e130e', glow:'#b9c6a8', ink:'#080c08' },
    { name: 'Ember Mist',    sky:'#bfb6ac', hzc:'#d3bda8', ground:'#948a7e', cloth:'#3a3a2e', clothHi:'#5a5742', clothLo:'#20201a', lining:'#9a3a2c', shadow:'#1c1a16', glow:'#f0d9b2', ink:'#14120e' },
  ];

  const MODES = ['Standing Coat', 'Stepping Dress', 'Hung Shirt', 'Seated Suit', 'Floating Hat', 'Procession'];
  const FORMATS = [[1040, 1330], [1180, 1180]]; // portrait (0.78) / square

  function pickPal(r) {
    // ALWAYS consume the pick so the rng draw order is identical with/without
    // FORCE_PAL (and identical to traits()). FORCE_PAL only overrides the result.
    const picked = K.pick(PALS, r);
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return picked;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 29);
    // ── HEADER rng draw order MUST match traits() EXACTLY (pal, mode, fmt, lightSide) ──
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const lightSide = r() < 0.5 ? -1 : 1;
    // ── everything below is draw-only; traits() does NOT read past lightSide ──
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    const jit = (a) => (r() - 0.5) * 2 * a;
    const rng = (lo, hi) => lo + r() * (hi - lo);

    // horizon — wide range so the camera framing genuinely changes seed to seed
    const hz = H * (0.26 + r() * 0.24);
    // low light behind the mist, on the chosen side; position jittered hard
    const lightX = lightSide < 0 ? W * (0.04 + r() * 0.22) : W * (0.74 + r() * 0.22);
    const lightY = hz * (0.36 + r() * 0.5);
    // garment placement: real x wander, drifts opposite the light so the
    // person-shadow has room to rake across the plain
    const objCx = W * (0.50 - lightSide * (0.02 + r() * 0.18));
    const objScale = 0.78 + r() * 0.54;
    const dir = lightX < objCx ? 1 : -1;          // shadow direction (away from light)

    // ===================== SKY / MIST FIELD =====================
    const g = x.createLinearGradient(0, 0, 0, hz + H * 0.10);
    g.addColorStop(0, pal.sky);
    g.addColorStop(0.7, K.mix(pal.sky, pal.hzc, 0.65));
    g.addColorStop(1, pal.hzc);
    x.fillStyle = g; x.fillRect(0, 0, W, hz + H * 0.12);

    // diffuse low glow where the light hides behind the mist
    K.bloom(x, lightX, lightY, S * (0.55 + r() * 0.30), pal.glow, 0.40);
    K.bloom(x, lightX, lightY, S * 0.22, pal.glow, 0.26);

    // ===================== GROUND PLANE =====================
    const gg = x.createLinearGradient(0, hz, 0, H);
    gg.addColorStop(0, K.mix(pal.ground, pal.hzc, 0.58)); // hazy at horizon
    gg.addColorStop(0.32, pal.ground);
    gg.addColorStop(1, K.mix(pal.ground, pal.ink, 0.26)); // darkens to foreground
    x.fillStyle = gg; x.fillRect(0, hz, W, H - hz);

    // faint receding seams toward a wandering vanishing point
    const vpx = lightX + (r() - 0.5) * W * 0.22, vpy = hz + (r() - 0.5) * H * 0.04;
    const seamN = 5 + (r() * 5 | 0);
    const seamSpread = W / (5.0 + r() * 2.6);
    const seamBase = W * (0.4 + r() * 0.2);
    x.save(); x.strokeStyle = K.rgba(pal.ink, 0.045 + r() * 0.03); x.lineWidth = 1.0 + r() * 0.5;
    for (let i = -seamN; i <= seamN; i++) {
      const fx = seamBase + i * seamSpread;
      x.beginPath(); x.moveTo(fx, H); x.lineTo(vpx, vpy + 4); x.stroke();
    }
    x.restore();
    K.mottle(x, 0, hz, W, H - hz, pal.ground, 58, r, 'overlay');

    // distant ghost garments — faint far-off silhouettes dissolving into mist
    const ghostN = (r() * 3.2 | 0);
    x.save();
    for (let gi = 0; gi < ghostN; gi++) {
      const gx2 = W * (0.08 + r() * 0.84);
      const gw2 = S * (0.016 + r() * 0.04);
      const gh2 = (H - hz) * (0.06 + r() * 0.12);
      const gy2 = hz + (H - hz) * (0.01 + r() * 0.07);
      x.fillStyle = K.rgba(K.mix(pal.ground, pal.cloth, 0.35), 0.05 + r() * 0.06);
      // a soft rounded-top blob (a distant standing garment)
      x.beginPath();
      x.moveTo(gx2 - gw2 / 2, gy2);
      x.lineTo(gx2 - gw2 / 2, gy2 - gh2 * 0.6);
      x.quadraticCurveTo(gx2 - gw2 / 2, gy2 - gh2, gx2, gy2 - gh2);
      x.quadraticCurveTo(gx2 + gw2 / 2, gy2 - gh2, gx2 + gw2 / 2, gy2 - gh2 * 0.6);
      x.lineTo(gx2 + gw2 / 2, gy2);
      x.closePath(); x.fill();
    }
    x.restore();

    // ===================== SHARED HELPERS =====================

    // The long raking shadow of a WHOLE PERSON — projected away from the low
    // light and down toward the viewer, splaying & fading into the ground fog.
    // A simple humanoid silhouette (head, torso, legs) skewed long & flat.
    function personShadow(footX, footY, personH, alpha) {
      // The figure is BUILT upright in a local space (origin at the feet, +y up),
      // then a skew matrix lays it flat across the plain toward the viewer and
      // off to the shadow side. This keeps the head/shoulders/legs unmistakably
      // legible no matter how long the rake is.
      const len = personH * (1.9 + r() * 1.4);     // how long the shadow stretches
      const splayX = dir * (0.50 + r() * 0.25);    // how far it skews sideways
      const floorBias = 0.42 + r() * 0.10;         // foreshortening down the plane
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.translate(footX, footY);
      // skew: local (lx, ly_up) -> screen. Up the body maps onto the rake vector
      // (sideways + down toward viewer); body WIDTH maps to screen x.
      // We want a unit of "up" to move the point along (splayX, floorBias)*len.
      const upX = splayX * len, upY = floorBias * len;
      // body half-width in local units (relative to personH)
      const hw = personH * 0.17;
      // place a point at body-height h (0..1.05) with lateral offset w (screen px)
      const pt = (h, w) => [w + h * upX, h * upY];
      // Build a clear humanoid: feet -> legs -> hips -> torso -> shoulders ->
      // neck -> head, mirrored down the other side. Heights are fractions of 1.
      // Hold the shadow strong almost the whole way, then a quick soft fade only
      // at the very tip — so the HEAD (which sits at the far end) stays legible.
      const grad = x.createLinearGradient(0, 0, upX, upY);
      grad.addColorStop(0, K.rgba(pal.shadow, alpha));
      grad.addColorStop(0.72, K.rgba(pal.shadow, alpha * 0.82));
      grad.addColorStop(1, K.rgba(pal.shadow, alpha * 0.32));
      x.fillStyle = grad;
      x.beginPath();
      // start outer-left foot, go UP the left side. Legs are SPLIT with a clear
      // gap, the neck pinches hard, and the head is a round mass — so the figure
      // reads as a person even tiny in the frame.
      let p;
      p = pt(0.00, -hw * 1.00); x.moveTo(p[0], p[1]);        // left foot outer
      p = pt(0.03, -hw * 1.25); x.lineTo(p[0], p[1]);        // foot toe splay
      p = pt(0.50, -hw * 0.66); x.lineTo(p[0], p[1]);        // left thigh
      p = pt(0.10, -hw * 0.14); x.lineTo(p[0], p[1]);        // inner left ankle (deep leg gap)
      p = pt(0.06, hw * 0.14);  x.lineTo(p[0], p[1]);        // inner right ankle
      p = pt(0.50, hw * 0.66);  x.lineTo(p[0], p[1]);        // right thigh
      p = pt(0.03, hw * 1.25);  x.lineTo(p[0], p[1]);        // right foot toe
      p = pt(0.00, hw * 1.00);  x.lineTo(p[0], p[1]);        // right foot outer
      p = pt(0.52, hw * 0.82);  x.lineTo(p[0], p[1]);        // right hip
      p = pt(0.64, hw * 1.12);  x.lineTo(p[0], p[1]);        // right shoulder (wide)
      p = pt(0.70, hw * 0.95);  x.lineTo(p[0], p[1]);        // shoulder top
      p = pt(0.76, hw * 0.22);  x.lineTo(p[0], p[1]);        // right neck (hard pinch)
      // head: a near-circular mass at the crown
      p = pt(0.82, hw * 0.62);  x.lineTo(p[0], p[1]);
      p = pt(0.92, hw * 0.66);  x.lineTo(p[0], p[1]);
      p = pt(1.02, hw * 0.42);  x.lineTo(p[0], p[1]);
      p = pt(1.08, 0);          x.lineTo(p[0], p[1]);        // crown
      p = pt(1.02, -hw * 0.42); x.lineTo(p[0], p[1]);
      p = pt(0.92, -hw * 0.66); x.lineTo(p[0], p[1]);
      p = pt(0.82, -hw * 0.62); x.lineTo(p[0], p[1]);
      p = pt(0.76, -hw * 0.22); x.lineTo(p[0], p[1]);        // left neck
      p = pt(0.70, -hw * 0.95); x.lineTo(p[0], p[1]);        // left shoulder top
      p = pt(0.64, -hw * 1.12); x.lineTo(p[0], p[1]);        // left shoulder
      p = pt(0.52, -hw * 0.82); x.lineTo(p[0], p[1]);        // left hip
      x.closePath(); x.fill();
      x.restore();
      // contact darkening right under the garment foot
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.shadow, alpha * 0.7);
      x.beginPath(); x.ellipse(footX, footY, personH * 0.13, personH * 0.03, 0, 0, 7); x.fill();
      x.restore();
    }

    // A draped cloth field: fills a polygon region with vertical fold shading,
    // crease highlights & shadows, plus material mottle. The heart of the look —
    // makes flat shapes read as heavy worn fabric, not vector blobs.
    // pts: array of [x,y] outline (closed). foldCx: center the folds radiate from.
    function drapeFill(pts, topY, botY, cloth, hi, lo, folds, foldSeedX, sheenT) {
      x.save();
      x.beginPath();
      x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.closePath();
      x.clip();
      // bounding box of the region
      let minX = 1e9, maxX = -1e9;
      for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
      const w = maxX - minX;
      // base body: a soft left-right light ramp (only ONE edge catches light so
      // it reads as matte cloth, not chrome)
      const litLeft = dir < 0;
      const bg2 = x.createLinearGradient(minX, 0, maxX, 0);
      const hiMix = K.mix(cloth, hi, 0.55), loMix = K.mix(cloth, lo, 0.6);
      if (litLeft) {
        bg2.addColorStop(0, hiMix); bg2.addColorStop(0.34, cloth);
        bg2.addColorStop(0.8, cloth); bg2.addColorStop(1, loMix);
      } else {
        bg2.addColorStop(0, loMix); bg2.addColorStop(0.2, cloth);
        bg2.addColorStop(0.66, cloth); bg2.addColorStop(1, hiMix);
      }
      x.fillStyle = bg2; x.fillRect(minX - 2, topY - 2, w + 4, botY - topY + 4);
      // top-down weight: cloth darkens toward the hem (gravity pooling shadow)
      const vg = x.createLinearGradient(0, topY, 0, botY);
      vg.addColorStop(0, K.rgba(hi, 0.10));
      vg.addColorStop(0.45, K.rgba(cloth, 0));
      vg.addColorStop(1, K.rgba(lo, 0.34));
      x.fillStyle = vg; x.fillRect(minX - 2, topY - 2, w + 4, botY - topY + 4);
      // vertical folds: each a soft shadow valley + a thin highlight ridge,
      // wandering with noise so they're organic & seed-unique
      for (let i = 0; i < folds; i++) {
        const t = (i + 0.5) / folds;
        const baseFx = minX + w * t;
        const wob = noise.noise2(foldSeedX + i * 0.7, 0.5) * w * 0.06;
        const fx = baseFx + wob;
        const fw = w / folds;
        // valley shadow
        const sh = 0.5 + 0.5 * Math.sin(i * 1.4 + foldSeedX);
        x.strokeStyle = K.rgba(lo, 0.22 + sh * 0.16);
        x.lineWidth = fw * (0.20 + sh * 0.18);
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(fx, topY + (botY - topY) * 0.04);
        x.bezierCurveTo(
          fx + wob * 1.5, topY + (botY - topY) * 0.4,
          fx - wob, topY + (botY - topY) * 0.7,
          fx + wob * 0.5, botY - (botY - topY) * 0.03
        );
        x.stroke();
        // ridge highlight just to the lit side of the valley
        const hoff = (litLeft ? -1 : 1) * fw * 0.22;
        x.strokeStyle = K.rgba(K.mix(hi, '#ffffff', 0.18), (0.10 + sh * 0.14) * (sheenT || 1));
        x.lineWidth = fw * 0.10;
        x.beginPath();
        x.moveTo(fx + hoff, topY + (botY - topY) * 0.06);
        x.bezierCurveTo(
          fx + hoff + wob * 1.5, topY + (botY - topY) * 0.4,
          fx + hoff - wob, topY + (botY - topY) * 0.7,
          fx + hoff + wob * 0.5, botY - (botY - topY) * 0.08
        );
        x.stroke();
      }
      // material weave mottle
      K.mottle(x, minX, topY, w, botY - topY, cloth, 30, r, 'overlay');
      x.restore();
      // a soft contour edge so the garment holds its silhouette even on pale
      // grounds (keeps bone/ivory cloth from dissolving into the mist) — the
      // paler the cloth, the stronger the edge so light garments never vanish
      x.save();
      x.lineJoin = 'round';
      const edgeA = 0.34 + K.clamp(K.lum(cloth) - 0.45, 0, 0.4) * 0.9;
      x.strokeStyle = K.rgba(K.mix(lo, pal.ink, 0.4), edgeA);
      x.lineWidth = Math.max(1.2, w * 0.007);
      x.beginPath();
      x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.closePath(); x.stroke();
      x.restore();
    }

    // a hem shadow line at the bottom edge of a garment (cloth has weight)
    function hemShade(cx, hemY, halfW, lo) {
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(lo, 0.5);
      x.beginPath(); x.ellipse(cx, hemY, halfW, halfW * 0.10, 0, 0, 7); x.fill();
      x.restore();
    }

    // ground footprint Y where the garment "stands"
    const standY = hz + (H - hz) * (0.22 + r() * 0.40);

    // ===================== COMPOSE PER MODE =====================
    if (mode === 'Standing Coat') {
      // a long coat standing upright, shoulders held by nothing: hanging sleeves,
      // a flaring hem, an empty standing collar. Tall and dignified.
      const cw = S * (0.26 + r() * 0.10) * objScale;
      const ch = (H - hz) * (0.66 + r() * 0.22) * objScale;
      const cx0 = objCx, topY = standY - ch;
      const shoulderW = cw * (1.00 + r() * 0.14);
      const collarOpen = cw * (0.13 + r() * 0.06);
      const hemW = cw * (0.86 + r() * 0.34); // coat flares at hem
      personShadow(cx0, standY, ch * (0.98 + r() * 0.12), 0.5);

      const shY = topY + ch * 0.12;                 // shoulder line
      const waistY = topY + ch * 0.46;
      // hanging sleeves OFF the shoulders first (so the body overlaps their tops)
      const slLen = ch * (0.46 + r() * 0.14), slW = cw * (0.20 + r() * 0.05);
      const slDrop = jit(cw * 0.04);
      [[-1], [1]].forEach((s) => {
        const sgn = s[0];
        const sx = cx0 + sgn * shoulderW * 0.46;     // sleeve hangs from shoulder end
        const sleeve = [
          [sx - sgn * slW * 0.3, shY - ch * 0.01],
          [sx + sgn * slW * 0.7, shY + ch * 0.02],
          [sx + sgn * slW * 0.6 + slDrop, shY + slLen],
          [sx - sgn * slW * 0.4 + slDrop, shY + slLen],
          [sx - sgn * slW * 0.5, shY + slLen * 0.4],
        ];
        drapeFill(sleeve, shY, shY + slLen, pal.cloth, pal.clothHi, pal.clothLo, 3, seed * 0.5 + sgn + 11, 0.95);
        // cuff turn-back showing lining
        x.fillStyle = K.rgba(pal.lining, 0.5);
        x.fillRect(sx - slW * 0.5 + slDrop, shY + slLen - ch * 0.03, slW, ch * 0.03);
      });

      // coat body: shoulders -> taper to waist -> flare to hem
      const left = [
        [cx0 - collarOpen, topY + ch * 0.04],
        [cx0 - shoulderW / 2, shY],
        [cx0 - shoulderW * 0.40, waistY],
        [cx0 - hemW / 2, standY],
      ];
      const right = [
        [cx0 + hemW / 2, standY],
        [cx0 + shoulderW * 0.40, waistY],
        [cx0 + shoulderW / 2, shY],
        [cx0 + collarOpen, topY + ch * 0.04],
      ];
      const pts = left.concat(right);
      drapeFill(pts, topY, standY, pal.cloth, pal.clothHi, pal.clothLo, 6 + (r() * 4 | 0), seed * 0.3, 1);
      hemShade(cx0, standY, hemW / 2, pal.clothLo);

      // empty collar / open neck showing oxblood lining + dark void where a neck would be
      x.save();
      x.fillStyle = K.mix(pal.lining, pal.ink, 0.2);
      x.beginPath();
      x.moveTo(cx0 - collarOpen, topY + ch * 0.05);
      x.quadraticCurveTo(cx0, topY + ch * 0.14, cx0 + collarOpen, topY + ch * 0.05);
      x.quadraticCurveTo(cx0, topY + ch * 0.01, cx0 - collarOpen, topY + ch * 0.05);
      x.closePath(); x.fill();
      // the hollow neck — a small dark ellipse of pure absence
      x.fillStyle = K.rgba(pal.ink, 0.85);
      x.beginPath(); x.ellipse(cx0, topY + ch * 0.06, collarOpen * 0.5, collarOpen * 0.34, 0, 0, 7); x.fill();
      // collar/lapel folds standing as if a neck fills them
      x.strokeStyle = K.rgba(pal.clothLo, 0.6); x.lineWidth = Math.max(2, cw * 0.02);
      x.beginPath(); x.moveTo(cx0 - collarOpen, topY + ch * 0.05); x.lineTo(cx0 - cw * 0.18, topY + ch * 0.20); x.stroke();
      x.beginPath(); x.moveTo(cx0 + collarOpen, topY + ch * 0.05); x.lineTo(cx0 + cw * 0.18, topY + ch * 0.20); x.stroke();
      x.restore();
      // center button placket
      x.strokeStyle = K.rgba(pal.clothLo, 0.5); x.lineWidth = Math.max(1.5, cw * 0.012);
      x.beginPath(); x.moveTo(cx0, topY + ch * 0.20); x.lineTo(cx0, standY - ch * 0.04); x.stroke();
      const btnN = 3 + (r() * 3 | 0);
      for (let i = 0; i < btnN; i++) {
        const by = topY + ch * (0.24 + i * (0.5 / btnN));
        x.fillStyle = K.mix(pal.clothHi, '#ffffff', 0.1);
        x.beginPath(); x.arc(cx0, by, cw * 0.018, 0, 7); x.fill();
      }

    } else if (mode === 'Stepping Dress') {
      // a long dress caught mid-stride: bodice + flowing skirt swept by motion,
      // one side lifting, hem trailing — empty, no legs, but striding
      const dw = S * (0.22 + r() * 0.10) * objScale;
      const dh = (H - hz) * (0.58 + r() * 0.24) * objScale;
      const cx0 = objCx, topY = standY - dh;
      const stepDir = dir;                       // strides in shadow direction
      const sway = dw * (0.20 + r() * 0.18) * stepDir; // skirt sweep
      const shoulderW = dw * 0.62;
      const waistY = topY + dh * 0.40;
      const waistW = dw * 0.34;
      personShadow(cx0 + sway * 0.3, standY, dh * (0.94 + r() * 0.12), 0.48);

      // skirt — swept parallelogram-ish flare, hem lifts on the leading side
      const hemLead = standY - dh * (0.06 + r() * 0.10); // leading hem lifts
      const skirt = [
        [cx0 - waistW / 2, waistY],
        [cx0 - dw * 0.5 + sway * 0.2, standY - dh * 0.02],
        [cx0 - dw * 0.30 + sway, (stepDir < 0 ? hemLead : standY)],
        [cx0 + dw * 0.30 + sway, (stepDir < 0 ? standY : hemLead)],
        [cx0 + dw * 0.5 + sway * 0.2, standY - dh * 0.02],
        [cx0 + waistW / 2, waistY],
      ];
      drapeFill(skirt, waistY, standY, pal.cloth, pal.clothHi, pal.clothLo, 7 + (r() * 5 | 0), seed * 0.4 + 1, 1.1);
      // trailing hem flick showing lining
      x.save();
      x.fillStyle = K.rgba(pal.lining, 0.55);
      const fx = stepDir < 0 ? cx0 + dw * 0.30 + sway : cx0 - dw * 0.30 + sway;
      x.beginPath();
      x.moveTo(fx, standY);
      x.quadraticCurveTo(fx + stepDir * dw * 0.12, standY + dh * 0.02, fx + stepDir * dw * 0.22, standY - dh * 0.04);
      x.quadraticCurveTo(fx + stepDir * dw * 0.10, standY - dh * 0.02, fx, standY - dh * 0.01);
      x.closePath(); x.fill();
      x.restore();

      // bodice — fitted, filled chest, narrow waist
      const bodice = [
        [cx0 - shoulderW / 2, topY + dh * 0.10],
        [cx0 - shoulderW * 0.42, topY + dh * 0.06],
        [cx0 + shoulderW * 0.42, topY + dh * 0.06],
        [cx0 + shoulderW / 2, topY + dh * 0.10],
        [cx0 + waistW / 2, waistY],
        [cx0 - waistW / 2, waistY],
      ];
      drapeFill(bodice, topY + dh * 0.06, waistY, pal.cloth, pal.clothHi, pal.clothLo, 4, seed * 0.5 + 2, 1.2);
      // empty scoop neck — dark absence where a throat/collarbone would be
      x.fillStyle = K.rgba(pal.ink, 0.7);
      x.beginPath();
      x.moveTo(cx0 - shoulderW * 0.28, topY + dh * 0.08);
      x.quadraticCurveTo(cx0, topY + dh * 0.18, cx0 + shoulderW * 0.28, topY + dh * 0.08);
      x.quadraticCurveTo(cx0, topY + dh * 0.12, cx0 - shoulderW * 0.28, topY + dh * 0.08);
      x.closePath(); x.fill();
      // thin shoulder straps standing on nothing
      x.strokeStyle = K.rgba(pal.clothHi, 0.7); x.lineWidth = Math.max(2, dw * 0.016);
      x.beginPath(); x.moveTo(cx0 - shoulderW * 0.30, topY + dh * 0.06); x.lineTo(cx0 - shoulderW * 0.22, topY + dh * 0.02); x.stroke();
      x.beginPath(); x.moveTo(cx0 + shoulderW * 0.30, topY + dh * 0.06); x.lineTo(cx0 + shoulderW * 0.22, topY + dh * 0.02); x.stroke();
      hemShade(cx0 + sway * 0.4, standY, dw * 0.45, pal.clothLo);

    } else if (mode === 'Hung Shirt') {
      // a dress shirt on a wire line, chest filled & rounded by nothing, sleeves
      // hanging, collar standing — a single peg/line floating in the mist
      const sw = S * (0.22 + r() * 0.10) * objScale;
      const sh = (H - hz) * (0.40 + r() * 0.20) * objScale;
      const cx0 = objCx;
      // hang it high so the hem floats above the ground (it's on a line)
      const topY = hz + (H - hz) * (0.06 + r() * 0.16);
      const hemY = topY + sh;
      const shoulderW = sw * (0.94 + r() * 0.14);
      const breeze = jit(sw * 0.10);             // a slight wind tilt
      personShadow(cx0 + breeze, standY, sh * (1.0 + r() * 0.14), 0.42);

      // the wire line + a small peg
      x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = Math.max(1.5, sw * 0.008);
      x.beginPath(); x.moveTo(cx0 - W * 0.5, topY - sh * 0.06 + jit(sh * 0.02)); x.lineTo(cx0 + W * 0.5, topY - sh * 0.02 + jit(sh * 0.02)); x.stroke();

      // shirt body — chest puffed full, tapering, hem
      const chestW = shoulderW * (0.96 + r() * 0.12);
      const body = [
        [cx0 - shoulderW / 2, topY + sh * 0.06],
        [cx0 - chestW / 2 - sw * 0.04, topY + sh * 0.30], // chest bulge
        [cx0 - chestW * 0.40, topY + sh * 0.6],
        [cx0 - chestW * 0.42, hemY],
        [cx0 + chestW * 0.42, hemY],
        [cx0 + chestW * 0.40, topY + sh * 0.6],
        [cx0 + chestW / 2 + sw * 0.04, topY + sh * 0.30],
        [cx0 + shoulderW / 2, topY + sh * 0.06],
      ];
      drapeFill(body, topY, hemY, pal.cloth, pal.clothHi, pal.clothLo, 6 + (r() * 4 | 0), seed * 0.35 + 3, 1.3);
      // sleeves hanging from the shoulders, swaying with the breeze
      const slLen = sh * (0.5 + r() * 0.2), slW = sw * (0.16 + r() * 0.05);
      [[-1], [1]].forEach((s) => {
        const sgn = s[0];
        const sx = cx0 + sgn * shoulderW / 2;
        const swayX = breeze * 0.6 + sgn * sw * 0.02;
        const sleeve = [
          [sx, topY + sh * 0.07],
          [sx + sgn * slW, topY + sh * 0.10],
          [sx + sgn * slW * 0.7 + swayX, topY + sh * 0.07 + slLen],
          [sx + swayX - sgn * slW * 0.3, topY + sh * 0.07 + slLen],
          [sx - sgn * slW * 0.2, topY + sh * 0.20],
        ];
        drapeFill(sleeve, topY + sh * 0.07, topY + sh * 0.07 + slLen, pal.cloth, pal.clothHi, pal.clothLo, 3, seed * 0.6 + sgn + 4, 1.1);
      });
      // standing collar with a dark hollow + a slice of lining
      x.fillStyle = K.mix(pal.cloth, pal.clothHi, 0.5);
      x.beginPath();
      x.moveTo(cx0 - shoulderW * 0.22, topY + sh * 0.06);
      x.lineTo(cx0 - shoulderW * 0.10, topY + sh * 0.005);
      x.lineTo(cx0 + shoulderW * 0.10, topY + sh * 0.005);
      x.lineTo(cx0 + shoulderW * 0.22, topY + sh * 0.06);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(pal.ink, 0.8);
      x.beginPath(); x.ellipse(cx0, topY + sh * 0.04, shoulderW * 0.10, sh * 0.022, 0, 0, 7); x.fill();
      x.fillStyle = K.rgba(pal.lining, 0.6);
      x.fillRect(cx0 - shoulderW * 0.03, topY + sh * 0.04, shoulderW * 0.06, sh * 0.16);
      // button placket
      x.strokeStyle = K.rgba(pal.clothLo, 0.45); x.lineWidth = Math.max(1.2, sw * 0.01);
      x.beginPath(); x.moveTo(cx0, topY + sh * 0.10); x.lineTo(cx0, hemY - sh * 0.04); x.stroke();
      // pegs at the shoulders
      x.fillStyle = K.rgba(pal.ink, 0.6);
      x.beginPath(); x.arc(cx0 - shoulderW * 0.36, topY + sh * 0.04, sw * 0.012, 0, 7); x.fill();
      x.beginPath(); x.arc(cx0 + shoulderW * 0.36, topY + sh * 0.04, sw * 0.012, 0, 7); x.fill();

    } else if (mode === 'Seated Suit') {
      // a suit (jacket + trousers) sitting in an absent chair — knees bent at a
      // seat height that isn't there, hands-on-thighs posture, empty collar
      const bw = S * (0.26 + r() * 0.10) * objScale;
      const bh = (H - hz) * (0.46 + r() * 0.18) * objScale;
      const cx0 = objCx;
      const seatY = standY - bh * (0.34 + r() * 0.06);   // invisible seat height
      const topY = seatY - bh * 0.72;                    // shoulders above seat
      personShadow(cx0, standY, bh * (1.05 + r() * 0.12), 0.5);

      // trousers — two bent legs: a substantial horizontal LAP (thigh) at seat
      // height, knees forward, then shins dropping straight to the floor. Drawn
      // as one continuous trouser-leg silhouette per side so nothing floats.
      const legW = bw * (0.26 + r() * 0.05);
      const kneeFwd = bw * (0.34 + r() * 0.06);             // how far knees jut toward viewer
      [[-1], [1]].forEach((s) => {
        const sgn = s[0];
        const hipX = cx0 + sgn * bw * 0.18;
        const kneeX = cx0 + sgn * bw * 0.30;
        // one shape: hip-top -> thigh top to knee -> down the shin front ->
        // shin back up -> thigh underside back to hip. A bent leg in profile-ish.
        const leg = [
          [hipX - sgn * legW * 0.5, seatY - legW * 0.55],   // hip top (under jacket hem)
          [kneeX, seatY - legW * 0.5 + kneeFwd * 0.05],      // thigh top toward knee
          [kneeX + sgn * legW * 0.55, seatY + legW * 0.0],   // knee front
          [kneeX + sgn * legW * 0.45, standY],               // shin front to floor
          [kneeX - sgn * legW * 0.45, standY],               // shin back to floor
          [kneeX - sgn * legW * 0.5, seatY + legW * 0.5],    // knee back
          [hipX + sgn * legW * 0.5, seatY + legW * 0.55],    // thigh underside / lap
        ];
        drapeFill(leg, seatY - legW * 0.55, standY, pal.cloth, pal.clothHi, pal.clothLo, 4, seed * 0.5 + sgn + 5, 0.9);
        // crease at the knee bend
        x.save(); x.globalCompositeOperation = 'multiply';
        x.strokeStyle = K.rgba(pal.clothLo, 0.32); x.lineWidth = Math.max(2, legW * 0.10);
        x.beginPath(); x.moveTo(kneeX - sgn * legW * 0.4, seatY + legW * 0.1); x.lineTo(kneeX + sgn * legW * 0.4, seatY + legW * 0.05); x.stroke();
        x.restore();
        // a shoe at the floor — a dark leather toe overlapping the trouser cuff
        x.fillStyle = K.mix(pal.ink, pal.lining, 0.18);
        x.beginPath();
        x.moveTo(kneeX - sgn * legW * 0.42, standY - legW * 0.12);
        x.lineTo(kneeX + sgn * legW * 0.46, standY - legW * 0.12);
        x.quadraticCurveTo(kneeX + sgn * legW * 0.72, standY - legW * 0.05, kneeX + sgn * legW * 0.66, standY + legW * 0.06);
        x.lineTo(kneeX - sgn * legW * 0.40, standY + legW * 0.06);
        x.closePath(); x.fill();
        // toe sheen
        x.fillStyle = K.rgba(pal.clothHi, 0.22);
        x.beginPath(); x.ellipse(kneeX + sgn * legW * 0.2, standY - legW * 0.04, legW * 0.28, legW * 0.05, 0, 0, 7); x.fill();
      });

      // jacket torso — sitting, hem draping over the invisible seat edge
      const torso = [
        [cx0 - bw * 0.36, topY],
        [cx0 - bw * 0.42, topY + bh * 0.06], // shoulder
        [cx0 - bw * 0.38, seatY - bh * 0.02],
        [cx0 - bw * 0.40, seatY + bh * 0.06], // hem flares over seat
        [cx0 + bw * 0.40, seatY + bh * 0.06],
        [cx0 + bw * 0.38, seatY - bh * 0.02],
        [cx0 + bw * 0.42, topY + bh * 0.06],
        [cx0 + bw * 0.36, topY],
      ];
      drapeFill(torso, topY, seatY + bh * 0.06, pal.cloth, pal.clothHi, pal.clothLo, 5 + (r() * 3 | 0), seed * 0.3 + 7, 1);
      // lapels + open collar showing shirt + lining + the dark hollow
      x.fillStyle = K.mix(pal.cloth, pal.clothLo, 0.4);
      x.beginPath();
      x.moveTo(cx0 - bw * 0.10, topY + bh * 0.02);
      x.lineTo(cx0 - bw * 0.04, topY + bh * 0.30);
      x.lineTo(cx0 - bw * 0.16, topY + bh * 0.24);
      x.closePath(); x.fill();
      x.beginPath();
      x.moveTo(cx0 + bw * 0.10, topY + bh * 0.02);
      x.lineTo(cx0 + bw * 0.04, topY + bh * 0.30);
      x.lineTo(cx0 + bw * 0.16, topY + bh * 0.24);
      x.closePath(); x.fill();
      // shirt V + dark absent neck
      x.fillStyle = K.mix(pal.clothHi, '#ffffff', 0.18);
      x.beginPath();
      x.moveTo(cx0 - bw * 0.05, topY + bh * 0.02);
      x.lineTo(cx0, topY + bh * 0.26);
      x.lineTo(cx0 + bw * 0.05, topY + bh * 0.02);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(pal.ink, 0.78);
      x.beginPath(); x.ellipse(cx0, topY + bh * 0.01, bw * 0.07, bh * 0.03, 0, 0, 7); x.fill();
      // arms resting on thighs (sleeves bending down then onto lap)
      [[-1], [1]].forEach((s) => {
        const sgn = s[0];
        const shoX = cx0 + sgn * bw * 0.40;
        const arm = [
          [shoX, topY + bh * 0.08],
          [shoX + sgn * bw * 0.06, topY + bh * 0.10],
          [cx0 + sgn * bw * 0.30, seatY - bh * 0.02],
          [cx0 + sgn * bw * 0.16, seatY],
          [cx0 + sgn * bw * 0.14, seatY - bh * 0.06],
          [shoX - sgn * bw * 0.04, topY + bh * 0.30],
        ];
        drapeFill(arm, topY + bh * 0.08, seatY, pal.cloth, pal.clothHi, pal.clothLo, 3, seed * 0.4 + sgn + 8, 0.95);
      });

    } else if (mode === 'Floating Hat') {
      // a hat + collar (and tie/scarf) floating at head height with NOTHING
      // between them — a beheaded ensemble holding its station in the mist
      const hatW = S * (0.20 + r() * 0.08) * objScale;
      const headY = hz + (H - hz) * (0.10 + r() * 0.22); // floats high
      const cx0 = objCx;
      const gap = hatW * (0.5 + r() * 0.5);              // void between hat & collar
      const collarY = headY + hatW * 0.6 + gap;
      personShadow(cx0, standY, (standY - headY) * (0.9 + r() * 0.12), 0.4);

      // the floating collar / shirt-top first (lower)
      const colW = hatW * (1.0 + r() * 0.2);
      const collar = [
        [cx0 - colW / 2, collarY],
        [cx0 - colW * 0.30, collarY - hatW * 0.18],
        [cx0 + colW * 0.30, collarY - hatW * 0.18],
        [cx0 + colW / 2, collarY],
        [cx0 + colW * 0.36, collarY + hatW * 0.36],
        [cx0 - colW * 0.36, collarY + hatW * 0.36],
      ];
      drapeFill(collar, collarY - hatW * 0.18, collarY + hatW * 0.36, pal.cloth, pal.clothHi, pal.clothLo, 4, seed * 0.5 + 9, 1.1);
      // collar opening hollow + lining
      x.fillStyle = K.rgba(pal.ink, 0.8);
      x.beginPath(); x.ellipse(cx0, collarY - hatW * 0.08, colW * 0.18, hatW * 0.08, 0, 0, 7); x.fill();
      x.fillStyle = K.rgba(pal.lining, 0.5);
      x.beginPath();
      x.moveTo(cx0 - colW * 0.16, collarY - hatW * 0.10);
      x.lineTo(cx0, collarY + hatW * 0.20);
      x.lineTo(cx0 + colW * 0.16, collarY - hatW * 0.10);
      x.closePath(); x.fill();
      // a tie or scarf hanging from the collar, drifting
      if (r() < 0.7) {
        const tieDrift = jit(hatW * 0.18);
        x.fillStyle = K.mix(pal.lining, pal.ink, 0.1);
        x.beginPath();
        x.moveTo(cx0 - colW * 0.07, collarY + hatW * 0.05);
        x.lineTo(cx0 + colW * 0.07, collarY + hatW * 0.05);
        x.lineTo(cx0 + tieDrift + colW * 0.05, collarY + hatW * 0.9);
        x.lineTo(cx0 + tieDrift, collarY + hatW * 1.0);
        x.lineTo(cx0 + tieDrift - colW * 0.05, collarY + hatW * 0.9);
        x.closePath(); x.fill();
      }

      // the hat — brim + crown, sitting at head height over the void
      const brimW = hatW * (1.0 + r() * 0.3);
      const brimY = headY + hatW * 0.42;
      const crownH = hatW * (0.5 + r() * 0.3);
      // brim ellipse
      x.fillStyle = K.mix(pal.cloth, pal.clothLo, 0.2);
      x.beginPath(); x.ellipse(cx0, brimY, brimW / 2, brimW * 0.12, 0, 0, 7); x.fill();
      x.fillStyle = K.mix(pal.cloth, pal.clothHi, dir < 0 ? 0.4 : 0.0);
      x.beginPath(); x.ellipse(cx0, brimY - hatW * 0.02, brimW / 2, brimW * 0.11, 0, 0, 7); x.fill();
      // crown — a rounded dome / fedora block with a fold
      const crown = [
        [cx0 - hatW * 0.34, brimY],
        [cx0 - hatW * 0.30, headY + hatW * 0.06],
        [cx0 - hatW * 0.12, headY - crownH * 0.2],
        [cx0 + hatW * 0.12, headY - crownH * 0.2],
        [cx0 + hatW * 0.30, headY + hatW * 0.06],
        [cx0 + hatW * 0.34, brimY],
      ];
      drapeFill(crown, headY - crownH * 0.2, brimY, pal.cloth, pal.clothHi, pal.clothLo, 3, seed * 0.4 + 10, 1);
      // hat band + pinch dent on top
      x.fillStyle = K.rgba(pal.lining, 0.6);
      x.fillRect(cx0 - hatW * 0.32, brimY - hatW * 0.12, hatW * 0.64, hatW * 0.07);
      x.strokeStyle = K.rgba(pal.clothLo, 0.55); x.lineWidth = Math.max(2, hatW * 0.02);
      x.beginPath(); x.moveTo(cx0 - hatW * 0.10, headY - crownH * 0.1); x.lineTo(cx0, headY + hatW * 0.02); x.lineTo(cx0 + hatW * 0.10, headY - crownH * 0.1); x.stroke();
      // under-brim shadow (a hat over an absent face)
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.ink, 0.5);
      x.beginPath(); x.ellipse(cx0, brimY + hatW * 0.04, brimW * 0.34, brimW * 0.07, 0, 0, 7); x.fill();
      x.restore();

    } else { // Procession — two or three garments walking away into the mist
      const count = r() < 0.6 ? 2 : 3;
      const members = [];
      const baseDir = dir;
      for (let i = 0; i < count; i++) {
        // each recedes further: smaller, higher (nearer horizon), fainter
        const depth = i / Math.max(1, count - 1);        // 0 nearest .. 1 farthest
        const sc = (1.0 - depth * 0.5) * objScale;
        const mx = objCx + baseDir * (W * 0.14) * i + jit(W * 0.05);
        const my = standY - (standY - hz) * depth * (0.55 + r() * 0.2);
        members.push({ mx, my, sc, depth, garb: r() < 0.5 ? 'coat' : 'cloak' });
      }
      // draw farthest first
      members.sort((a, b) => a.depth - b.depth).reverse();
      for (const m of members) {
        const cw = S * 0.18 * m.sc;
        const ch = (H - hz) * 0.5 * m.sc;
        const topY = m.my - ch;
        const fade = 0.45 + (1 - m.depth) * 0.55;
        // person-shadow per member (mismatched lengths → uncanny)
        personShadow(m.mx, m.my, ch * (0.9 + r() * 0.2), 0.4 * fade);
        // a back-view long coat/cloak: rounded shoulders, tapering hem
        const shoulderW = cw * (0.9 + r() * 0.1);
        const hemW = cw * (0.8 + r() * 0.3);
        const pts = [
          [m.mx - cw * 0.06, topY + ch * 0.02],         // hood/collar top
          [m.mx - shoulderW / 2, topY + ch * 0.12],
          [m.mx - hemW / 2, m.my],
          [m.mx + hemW / 2, m.my],
          [m.mx + shoulderW / 2, topY + ch * 0.12],
          [m.mx + cw * 0.06, topY + ch * 0.02],
        ];
        x.save();
        x.globalAlpha = fade;
        drapeFill(pts, topY, m.my, pal.cloth, pal.clothHi, pal.clothLo, 5, seed * 0.3 + m.depth * 10, 1);
        // empty raised hood (back view) — a dark hollow
        x.fillStyle = K.rgba(pal.ink, 0.6 * fade);
        x.beginPath(); x.ellipse(m.mx, topY + ch * 0.06, cw * 0.12, ch * 0.05, 0, 0, 7); x.fill();
        // a sliver of lining at the hem vent
        x.fillStyle = K.rgba(pal.lining, 0.4 * fade);
        x.fillRect(m.mx - cw * 0.02, m.my - ch * 0.18, cw * 0.04, ch * 0.18);
        x.restore();
        hemShade(m.mx, m.my, hemW / 2, pal.clothLo);
      }
    }

    // ===================== ATMOSPHERE & TEXTURE =====================
    // ground-level mist band seating the garment(s) into the plane
    const fogc = K.mix(pal.hzc, pal.glow, 0.4);
    const fb = x.createLinearGradient(0, standY - H * 0.12, 0, standY + H * 0.08);
    fb.addColorStop(0, K.rgba(fogc, 0));
    fb.addColorStop(0.5, K.rgba(fogc, 0.32));
    fb.addColorStop(1, K.rgba(fogc, 0));
    x.fillStyle = fb; x.fillRect(0, standY - H * 0.14, W, H * 0.24);

    // volumetric haze sheet over everything — the signature air
    const hazeCol = K.mix(pal.hzc, pal.glow, 0.42);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.20, S * 0.85, 'screen');
    // a finer haze pass low near the light to make it glow through the mist
    K.hazeSheet(x, W, H, noise, pal.glow, 0.10, S * 0.42, 'screen');

    // distant horizon dust to dissolve the ground edge
    const hh = x.createLinearGradient(0, hz - H * 0.04, 0, hz + H * 0.10);
    hh.addColorStop(0, K.rgba(pal.hzc, 0));
    hh.addColorStop(0.5, K.rgba(pal.hzc, 0.55));
    hh.addColorStop(1, K.rgba(pal.hzc, 0));
    x.fillStyle = hh; x.fillRect(0, hz - H * 0.05, W, H * 0.16);

    // film grain + vignette to seat it
    K.grain(x, W, H, 5.0, r);
    const dark = pal.name === 'Forest Compline' || pal.name === 'Oxblood Dusk';
    K.vignette(x, W, H, dark ? 0.44 : 0.34);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    // mirror draw()'s HEADER draw order EXACTLY: pal, mode, fmt, lightSide.
    const palPick = K.pick(PALS, r);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || palPick) : palPick;
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const lightSide = r() < 0.5 ? 'West Light' : 'East Light';
    const f = fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Garment: mode, Format: f, Light: lightSide };
  }

  return { name: 'h4_vestment', draw, traits };
})();
