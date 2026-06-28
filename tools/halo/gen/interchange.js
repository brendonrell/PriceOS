/* INTERCHANGE — a surreal transit cathedral.
 * A vast vaulted interchange hall: nested cathedral arches recede to a vanishing
 * point, maglev trains streak through as long-exposure light-ribbons, hanging
 * departure-glyph boards float and dissolve into haze, fog pools in the nave.
 * Read like a Turner painting of a station that never ends.
 * PALETTE: warm sodium dark — sodium amber / oxblood / deep plum, cream highlights. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Sodium-warm colorways. bg = nave ground; vault = arch silhouette base;
  // lamp = sodium-vapour glow; trail = maglev light-ribbon; ember = oxblood accent;
  // cream = highlight. All within the warm-sodium family, distinct moods.
  const PALS = [
    { name: 'Sodium Nave',   bg: '#1a0f2e', vault: '#241334', lamp: '#ffb02e', trail: '#ffd089', ember: '#6e1326', cream: '#fff0d6' },
    { name: 'Oxblood Dusk',  bg: '#140a1c', vault: '#2a0f1e', lamp: '#ff9a2e', trail: '#ffba6a', ember: '#7a1424', cream: '#ffe6c2' },
    { name: 'Amber Vault',   bg: '#1c1124', vault: '#2e1626', lamp: '#ffbe3d', trail: '#ffe0a0', ember: '#5e1430', cream: '#fff4dc' },
    { name: 'Deep Plum',     bg: '#160a26', vault: '#22102e', lamp: '#ffa83a', trail: '#ffcd86', ember: '#691233', cream: '#ffead0' },
    { name: 'Ember Hall',    bg: '#1e0d1a', vault: '#300f1c', lamp: '#ff8c24', trail: '#ffb060', ember: '#86182c', cream: '#ffdcb0' },
    { name: 'Plum Sodium',   bg: '#120c2a', vault: '#1e1236', lamp: '#ffc24a', trail: '#ffd99a', ember: '#5a1640', cream: '#fff2da' },
  ];
  const FMTS = [
    { W: 1480, H: 1180, t: 'Hall' },
    { W: 1240, H: 1480, t: 'Nave' },
    { W: 1280, H: 1280, t: 'Square' },
  ];
  const TIMES = ['Last Train', 'Rush Hour', 'Dead of Night', 'First Light'];
  const FLOWS = ['Streaking', 'Becalmed', 'Crossfire'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      time: K.pick(TIMES, r),
      flow: K.pick(FLOWS, r),
      arches: K.rint(r, 9, 14),
      // vanishing point placement — drives composition variety
      vpx: 0.30 + r() * 0.40,
      vpy: 0.38 + r() * 0.20,
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Hour: p.time, Traffic: p.flow };
  }

  // A pointed cathedral arch outline as a path (gothic: legs → springline → apex).
  function archPath(x, cx, top, halfW, springY, baseY) {
    x.moveTo(cx - halfW, baseY);
    x.lineTo(cx - halfW, springY);
    x.quadraticCurveTo(cx - halfW, top + (springY - top) * 0.18, cx, top);
    x.quadraticCurveTo(cx + halfW, top + (springY - top) * 0.18, cx + halfW, springY);
    x.lineTo(cx + halfW, baseY);
  }

  // Perspective geometry for one arch at depth d (0 = far/at-VP, 1 = near/frame).
  function archAt(d, VPX, VPY, W, H) {
    const s = Math.pow(d, 1.55);                 // non-linear: bunch toward VP
    const halfW = W * 0.045 + s * W * 0.70;
    const apexTop = VPY - (H * 0.035 + s * H * 0.56);
    const springY = VPY - (H * 0.005 + s * H * 0.16);
    const baseY = VPY + (H * 0.015 + s * (H - VPY) * 1.25);
    return { d, s, halfW, apexTop, springY, baseY, cx: VPX };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const VPX = W * p.vpx, VPY = H * p.vpy;
    const night = p.time === 'Dead of Night';
    const dawn = p.time === 'First Light';
    const lampGlow = night ? 0.16 : dawn ? 0.34 : 0.26;

    // ── 1. base nave gradient: dark ground rising to a hazy lit vanishing core
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.34));
    g.addColorStop(Math.max(0.05, VPY / H - 0.10), K.mix(P.bg, P.vault, 0.55));
    g.addColorStop(VPY / H, K.mix(P.vault, P.lamp, dawn ? 0.32 : night ? 0.10 : 0.22));
    g.addColorStop(Math.min(0.98, VPY / H + 0.12), K.mix(P.bg, P.ember, 0.32));
    g.addColorStop(1, K.mix(P.bg, '#000', 0.20));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // ── 2. NESTED RECEDING ARCHES — draw FAR→NEAR as solid vault bands so the
    // hall reads as a tunnel of arch-after-arch boring into the vanishing point.
    const N = p.arches;
    const geo = [];
    for (let i = 0; i < N; i++) geo.push(archAt((i + 0.6) / N, VPX, VPY, W, H));

    // The lit far core glows through the smallest arch opening.
    K.bloom(x, VPX, VPY, Math.min(W, H) * (dawn ? 0.40 : 0.30), P.lamp, lampGlow);
    K.bloom(x, VPX, VPY, Math.min(W, H) * 0.13, P.cream, night ? 0.10 : 0.22);

    // Draw vault bands far→near. Each band = arch[i] silhouette minus arch[i-1]
    // opening (the next arch inward), so the wall between two arches is solid.
    for (let i = N - 1; i >= 0; i--) {
      const A = geo[i];
      const inner = geo[i - 1]; // smaller, nearer the VP (may be undefined for i=0)
      const depth = A.d; // 0..1, near = high
      // atmospheric perspective: far bands tinted toward lamp/haze & lighter;
      // near bands dark, saturated, solid.
      // far bands = hazy/lit masonry; near bands = deep shadow vault. The wall
      // between two arches must read SOLID & darkening so the hall feels real.
      const tone = depth < 0.5
        ? K.mix(K.mix(P.vault, P.lamp, 0.30), P.bg, 0.35)   // far: warm lit stone
        : K.mix(P.vault, '#000', 0.35 + depth * 0.4);        // near: deep shadow
      const fillCol = tone;
      const aFill = 0.55 + depth * 0.40;

      x.save();
      x.beginPath();
      archPath(x, VPX, A.apexTop, A.halfW, A.springY, A.baseY);
      if (inner) {
        archPath(x, VPX, inner.apexTop, inner.halfW, inner.springY, inner.baseY + 1);
      } else {
        // innermost: small opening at the VP so the core glow shows through
        const oh = A.halfW * 0.30, ot = A.apexTop + (A.baseY - A.apexTop) * 0.16;
        const os = A.springY + (A.baseY - A.springY) * 0.10;
        archPath(x, VPX, ot, oh, os, A.baseY + 1);
      }
      x.closePath();
      // gradient fill: band glows warmer toward the lit core (VP), darker outward
      const bgr = x.createRadialGradient(VPX, VPY, 0, VPX, VPY, A.halfW * 1.6);
      bgr.addColorStop(0, K.rgba(K.mix(fillCol, P.lamp, 0.30 * (1 - depth) + 0.06), aFill));
      bgr.addColorStop(0.55, K.rgba(fillCol, aFill));
      bgr.addColorStop(1, K.rgba(K.mix(fillCol, '#000', 0.4), Math.min(1, aFill + 0.12)));
      x.fillStyle = bgr;
      x.fill('evenodd');

      // sodium rim light tracing the arch lip — brighter & warmer when nearer
      x.beginPath();
      archPath(x, VPX, A.apexTop, A.halfW, A.springY, A.baseY);
      x.strokeStyle = K.rgba(K.mix(P.lamp, P.cream, 0.25), 0.05 + depth * 0.32);
      x.lineWidth = 0.7 + depth * 2.0;
      x.stroke();
      // a faint inner ember line for thickness
      if (depth > 0.25) {
        x.strokeStyle = K.rgba(P.ember, 0.04 + depth * 0.14);
        x.lineWidth = 0.6 + depth;
        x.stroke();
      }
      x.restore();

      // hazy veil drifting in front of the far bands (smooth atmospheric depth,
      // a soft radial wash centred on the core — far arches sink into fog).
      if (depth < 0.6 && i % 2 === 0) {
        x.save();
        x.globalCompositeOperation = 'screen';
        const veilR = Math.max(W, H) * (0.5 - depth * 0.3);
        const vg = x.createRadialGradient(VPX, VPY, 0, VPX, VPY, veilR);
        const vc = K.mix(P.vault, P.lamp, 0.18);
        vg.addColorStop(0, K.rgba(vc, (1 - depth) * 0.16 + 0.03));
        vg.addColorStop(1, K.rgba(vc, 0));
        x.fillStyle = vg; x.fillRect(0, 0, W, H);
        x.restore();
      }
    }

    // ── 3. floor: receding rail/track lines + transverse sleepers + light pool
    x.save();
    x.globalCompositeOperation = 'screen';
    // rail fan lines from VP to base — only a few central rails, faint, so it
    // reads as track converging in fog, NOT a crisp UI grid.
    const railN = 6;
    for (let i = 0; i <= railN; i++) {
      const t = i / railN;
      const ex = VPX + (t - 0.5) * W * 1.9;
      const cen = 1 - Math.abs(t - 0.5) * 2;
      x.strokeStyle = K.rgba(K.mix(P.vault, P.lamp, 0.5), 0.02 + 0.035 * cen);
      x.lineWidth = 0.8 + cen * 1.2;
      x.beginPath(); x.moveTo(VPX, VPY); x.lineTo(ex, H + 4); x.stroke();
    }
    x.restore();
    // reflective light pool on the floor under the core — soft radial wash,
    // no hard slab edge (it should bleed into fog, Turner-style).
    x.save();
    x.globalCompositeOperation = 'lighter';
    const rg = x.createRadialGradient(VPX, VPY + (H - VPY) * 0.10, 0,
      VPX, VPY + (H - VPY) * 0.10, Math.max(W, H) * 0.60);
    rg.addColorStop(0, K.rgba(P.lamp, night ? 0.08 : 0.16));
    rg.addColorStop(0.4, K.rgba(P.ember, 0.07));
    rg.addColorStop(1, K.rgba(P.bg, 0));
    x.fillStyle = rg;
    x.fillRect(0, VPY, W, H - VPY);
    // foreground platform light band — a low backlit haze along the bottom so
    // the crowd is silhouetted against it and the lower frame isn't dead black.
    const platY = H * 0.80;
    const pg = x.createLinearGradient(0, platY, 0, H);
    pg.addColorStop(0, K.rgba(K.mix(P.ember, P.lamp, 0.4), night ? 0.05 : 0.10));
    pg.addColorStop(0.55, K.rgba(P.ember, night ? 0.06 : 0.11));
    pg.addColorStop(1, K.rgba(K.mix(P.bg, P.ember, 0.5), 0.05));
    x.fillStyle = pg; x.fillRect(0, platY, W, H - platY);
    x.restore();

    // ── 4. sodium-vapour lamps strung down the nave in converging rows
    x.save();
    x.globalCompositeOperation = 'lighter';
    const lampRows = K.rint(r, 6, 9);
    for (let i = 0; i < lampRows; i++) {
      const t = Math.pow((i + 1) / (lampRows + 1), 1.7);
      const ly = VPY - (H * 0.015 + t * H * 0.34);
      const rad = 3 + t * 30;
      for (const side of [-1, 1]) {
        const lx = VPX + side * (t * W * 0.32);
        K.bloom(x, lx, ly, rad, P.lamp, 0.5 - t * 0.18);
        x.fillStyle = K.rgba(P.cream, 0.65 - t * 0.32);
        x.beginPath(); x.arc(lx, ly, Math.max(0.6, rad * 0.10), 0, 7); x.fill();
      }
    }
    x.restore();

    // ── 5. MAGLEV LIGHT-TRAILS — long-exposure ribbons streaking THROUGH the
    // arches. A train enters from the side of the tunnel, sweeps toward the VP
    // (or out of it), motion-blurred into a glowing horizontal ribbon.
    // A train is a horizontal sweep across the hall at a chosen DEPTH band: it
    // emerges from one side, curves slightly with the track, and the long
    // exposure smears it into a glowing motion-blurred ribbon. Depth sets its
    // size, brightness and how high it sits in the frame (perspective).
    const streakCount = p.flow === 'Crossfire' ? K.rint(r, 4, 6)
      : p.flow === 'Becalmed' ? 2
      : K.rint(r, 3, 5);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < streakCount; i++) {
      // depth band the train runs in (0.18 far/small .. 0.92 near/big)
      const dep = 0.18 + Math.pow(r(), 1.2) * 0.74;
      // y for this depth on the floor track, slightly above it (the train body)
      const trackY = VPY + Math.pow(dep, 1.5) * (H - VPY) * 0.78;
      const railH = (8 + dep * dep * 70);       // body height at this depth
      const enter = r() < 0.5 ? -1 : 1;          // side it sweeps in from
      const cross = p.flow === 'Crossfire' && r() < 0.5;
      // horizontal extent: spans across the hall, narrowing toward the VP column
      const span = W * (0.30 + dep * 0.55);
      const x0 = enter < 0 ? VPX - span : VPX + span * 0.15;
      const x1 = enter < 0 ? VPX + span * 0.15 : VPX + span;
      // build the swept ribbon as a polyline that bows gently toward the VP
      const segs = 28;
      const pts = [];
      for (let sI = 0; sI <= segs; sI++) {
        const t = sI / segs;
        const xx = x0 + (x1 - x0) * t;
        // distance from VP column → perspective: nearer the VP column the track
        // is higher in frame AND the ribbon is thinner — gives a real curved sweep.
        const offC = Math.min(1, Math.abs(xx - VPX) / (W * 0.55));
        const persp = 1 - offC;               // 1 at VP column, 0 at edges
        const lift = persp * railH * 1.4;      // rise toward the VP (curve)
        const sway = noise.fbm(i * 3.7 + t * 4, seed * 0.013 + i, 3) * railH * 0.35;
        const yy = trackY - lift + sway;
        pts.push([xx, yy, t, 0.45 + persp * 0.55]); // 4th = local width scale
      }
      const col = r() < 0.20 ? P.ember : (r() < 0.5 ? P.trail : P.cream);
      // 3 stacked motion-blur strands at slightly different y to fake exposure smear
      const strands = [-0.5, 0, 0.5];
      for (const sOff of strands) {
        for (let pass = 0; pass < 2; pass++) {
          x.beginPath();
          for (let sI = 0; sI < pts.length; sI++) {
            const [px, py] = pts[sI];
            const yo = py + sOff * railH * 0.5;
            if (sI === 0) x.moveTo(px, yo); else x.lineTo(px, yo);
          }
          const wdt = pass === 0 ? railH * 0.9 : railH * 0.22;
          const al = (pass === 0 ? 0.045 : 0.16) * (sOff === 0 ? 1 : 0.6)
            * (p.flow === 'Becalmed' ? 0.55 : 1);
          x.strokeStyle = K.rgba(pass === 0 ? col : K.mix(col, P.cream, 0.4), al);
          x.lineWidth = wdt; x.lineCap = 'round'; x.lineJoin = 'round';
          x.stroke();
        }
      }
      // bright headlight at the leading end + a hot core dash midway
      const head = pts[pts.length - 1];
      K.bloom(x, head[0], head[1], railH * (0.9 + dep), K.mix(col, P.cream, 0.5), 0.5);
      const mid = pts[Math.floor(pts.length * (0.4 + r() * 0.3))];
      K.bloom(x, mid[0], mid[1], railH * 0.7, col, 0.35);
      // windows: a row of bright dashes along the ribbon (long-exposure carriage lights)
      for (let sI = 2; sI < pts.length - 1; sI += 2) {
        const [px, py] = pts[sI];
        x.fillStyle = K.rgba(K.mix(col, P.cream, 0.3), 0.4 * (p.flow === 'Becalmed' ? 0.6 : 1));
        x.fillRect(px - railH * 0.06, py - railH * 0.06, railH * 0.18, railH * 0.12);
      }
    }
    x.restore();

    // ── 6. floating departure-glyph boards — anchored over the platform, in
    // converging rows down the nave, hazier & smaller with depth.
    x.save();
    const boardCount = K.rint(r, 9, 15);
    for (let i = 0; i < boardCount; i++) {
      const dt = Math.pow(0.06 + r() * 0.94, 1.3);  // 0 far .. 1 near
      const side = r() < 0.5 ? -1 : 1;
      const bx = VPX + side * (0.05 + dt) * W * (0.06 + r() * 0.26);
      const by = VPY - (H * 0.06) - dt * H * 0.16 + (r() - 0.5) * H * 0.05;
      const bw = (7 + dt * 78) * (0.7 + r() * 0.6);
      const bh = bw * (0.30 + r() * 0.26);
      // panel body — dark glass, sodium edge
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = K.rgba(K.mix(P.bg, P.ember, 0.4), 0.45 + dt * 0.42);
      x.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      x.strokeStyle = K.rgba(P.lamp, 0.18 + dt * 0.4);
      x.lineWidth = 0.6 + dt; x.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
      // departure glyph rows — tiny lit blocks
      x.globalCompositeOperation = 'lighter';
      const rows = K.rint(r, 2, 4);
      for (let rr = 0; rr < rows; rr++) {
        const ry = by - bh / 2 + (rr + 0.5) * (bh / rows);
        let cxp = bx - bw / 2 + bw * 0.08;
        while (cxp < bx + bw / 2 - bw * 0.08) {
          const gw = bw * (0.04 + r() * 0.13);
          if (r() < 0.72) {
            const gc = r() < 0.22 ? P.cream : P.lamp;
            x.fillStyle = K.rgba(gc, (0.3 + dt * 0.5) * (0.5 + r() * 0.5));
            x.fillRect(cxp, ry - bh * 0.06, gw, bh * 0.12);
          }
          cxp += gw + bw * 0.04;
        }
      }
      K.bloom(x, bx, by, bw * 0.85, P.lamp, 0.08 + dt * 0.13);
      // suspension line up into the haze
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(P.lamp, 0.05 + dt * 0.10);
      x.lineWidth = 0.6;
      x.beginPath(); x.moveTo(bx, by - bh / 2);
      x.lineTo(bx + (r() - 0.5) * bw * 0.2, by - bh / 2 - (18 + dt * 70)); x.stroke();
    }
    x.restore();

    // ── 7. foreground platform crowd — small believable silhouettes (scale cue).
    // Surreal note: an impossibly tall figure or two, dwarfed by the hall.
    x.save();
    const crowd = K.rint(r, 16, 26);
    for (let i = 0; i < crowd; i++) {
      const fx = r() * W;
      const giant = r() < 0.07;
      // depth across the platform: nearer figures (lower in frame) are bigger
      const pd = r();                          // 0 back-of-platform .. 1 nearest
      const base = giant ? 0.30 + r() * 0.10 : 0.05 + pd * 0.085;
      const fh = H * base;
      const fy = H * 0.84 + pd * H * 0.15;     // stand along the lit platform band
      const fw = fh * (0.16 + r() * 0.05);
      const col = K.rgba(K.mix(P.bg, '#000', 0.62), giant ? 0.5 : 0.9);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = col;
      x.lineCap = 'round'; x.strokeStyle = col;
      // legs (two strokes) — gives a real human read
      x.lineWidth = fw * 0.34;
      x.beginPath();
      x.moveTo(fx - fw * 0.16, fy - fh * 0.42); x.lineTo(fx - fw * 0.22, fy);
      x.moveTo(fx + fw * 0.16, fy - fh * 0.42); x.lineTo(fx + fw * 0.22, fy);
      x.stroke();
      // torso (tapered)
      x.beginPath();
      x.moveTo(fx - fw * 0.40, fy - fh * 0.40);
      x.lineTo(fx - fw * 0.30, fy - fh * 0.78);
      x.quadraticCurveTo(fx, fy - fh * 0.86, fx + fw * 0.30, fy - fh * 0.78);
      x.lineTo(fx + fw * 0.40, fy - fh * 0.40);
      x.closePath(); x.fill();
      // shoulders/arms hint
      x.lineWidth = fw * 0.26;
      x.beginPath();
      x.moveTo(fx - fw * 0.34, fy - fh * 0.72); x.lineTo(fx - fw * 0.42, fy - fh * 0.40);
      x.moveTo(fx + fw * 0.34, fy - fh * 0.72); x.lineTo(fx + fw * 0.42, fy - fh * 0.40);
      x.stroke();
      // head
      x.beginPath(); x.arc(fx, fy - fh * 0.90, fw * 0.27, 0, 7); x.fill();
      // sodium rim light on one shoulder
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(P.lamp, giant ? 0.07 : 0.13);
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(fx + fw * 0.32, fy - fh * 0.78); x.lineTo(fx + fw * 0.42, fy - fh * 0.42); x.stroke();
    }
    x.restore();

    // ── 8. atmosphere finish: ONE large-scale organic fbm haze (scale big enough
    // that its blocks read as drifting fog, not a grid), low fog pool, grain, vignette.
    K.hazeSheet(x, W, H, noise, K.mix(P.lamp, P.cream, 0.2), night ? 0.08 : 0.12, 360, 'screen');
    // low sodium fog pooling in the nave (bottom third) — smooth gradient
    x.save();
    x.globalCompositeOperation = 'screen';
    const fogG = x.createLinearGradient(0, H * 0.56, 0, H);
    fogG.addColorStop(0, K.rgba(P.vault, 0));
    fogG.addColorStop(1, K.rgba(K.mix(P.vault, P.lamp, 0.16), 0.24));
    x.fillStyle = fogG; x.fillRect(0, H * 0.56, W, H * 0.44);
    // a drifting fog bank across the mid-nave, additive & soft
    const bankY = VPY + (H - VPY) * (0.25 + (noise.fbm(seed * 0.1, 3, 2) + 1) * 0.15);
    const bg2 = x.createLinearGradient(0, bankY - H * 0.10, 0, bankY + H * 0.14);
    bg2.addColorStop(0, K.rgba(P.lamp, 0));
    bg2.addColorStop(0.5, K.rgba(K.mix(P.lamp, P.cream, 0.3), night ? 0.05 : 0.09));
    bg2.addColorStop(1, K.rgba(P.lamp, 0));
    x.fillStyle = bg2; x.fillRect(0, bankY - H * 0.10, W, H * 0.24);
    x.restore();

    if (p.flow !== 'Becalmed') K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, 0.52);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'interchange', draw, traits };
})();
