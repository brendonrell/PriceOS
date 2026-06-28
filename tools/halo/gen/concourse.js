/* CONCOURSE — a surreal airport concourse floating in an endless cloud sea.
 * Departure gates, jet-bridges and glass walls perched on a cloud-island at
 * golden hour. Contrails crisscross a deep luminous sky; god-rays shaft down
 * through fog; a flock of craft drift as bloom-haloed silhouettes. The runway
 * just ends in sky, gates open onto clouds, and the plane parked at the gate is
 * the size of a moth. Serene, high-key, dreamy.
 * PALETTE: GOLDEN CLOUDPORT — peach-gold / sky cyan / soft lavender. Warm light,
 * cool shadows. Read like a Turner sky with a glass terminal floating in it. */
window.ENGINE = (function () {
  const K = window.KIT;

  // All within the peach-gold / cyan / lavender family. sky0=zenith, sky1=mid,
  // sky2=horizon glow; gold=warm light; cyan=cool sky accent; lav=lavender
  // shadow; glass=terminal body; cream=hot highlight.
  const PALS = [
    { name: 'Golden Cloudport', sky0: '#7fb8e8', sky1: '#b9c4ee', sky2: '#ffcf7a', gold: '#ffcf7a', cyan: '#6fd6ff', lav: '#b9a6e8', glass: '#d8c8e8', cream: '#fff4dc' },
    { name: 'Peach Dawn',       sky0: '#8fb0dd', sky1: '#d4bce0', sky2: '#ffc48a', gold: '#ffd28a', cyan: '#7fd0ff', lav: '#c0a8e6', glass: '#e2cfe2', cream: '#fff6e2' },
    { name: 'Cyan Plateau',     sky0: '#6fb6e8', sky1: '#a8c8ee', sky2: '#ffd89a', gold: '#ffd28c', cyan: '#5fd0ff', lav: '#aea0e2', glass: '#cfe0f0', cream: '#fff8e8' },
    { name: 'Lavender Drift',   sky0: '#92a8e0', sky1: '#c4b0e8', sky2: '#ffc880', gold: '#ffcb80', cyan: '#82caf6', lav: '#c4a8ec', glass: '#ddccec', cream: '#fff3d8' },
    { name: 'Amber Stratos',    sky0: '#7caedd', sky1: '#bcc0e6', sky2: '#ffbf6e', gold: '#ffc46e', cyan: '#6cccfa', lav: '#b6a2e4', glass: '#d6c6e6', cream: '#fff0d0' },
    { name: 'High Noon Haze',   sky0: '#8cc0ee', sky1: '#cdd6f4', sky2: '#ffe0a8', gold: '#ffdca0', cyan: '#74d8ff', lav: '#c2b2ea', glass: '#e4dcf0', cream: '#fffaee' },
  ];
  const FMTS = [
    { W: 1480, H: 1100, t: 'Wide' },
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1180, H: 1420, t: 'Tower' },
  ];
  const TIMES = ['Golden Hour', 'First Light', 'High Sun', 'Last Light'];
  const TRAFFIC = ['Becalmed', 'Departures', 'Crosswind'];

  function params(r) {
    const plateauX = 0.18 + r() * 0.52;
    // sun sits OPPOSITE the plateau so it never blows out the terminal, kept low
    // near the horizon (a setting/rising sun, not a noon flood)
    const sunx = plateauX < 0.5 ? 0.66 + r() * 0.28 : 0.06 + r() * 0.28;
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      time: K.pick(TIMES, r),
      traffic: K.pick(TRAFFIC, r),
      // horizon placement — soft mid-horizon, varies the composition a lot
      horizon: 0.46 + (r() - 0.5) * 0.22,
      plateauX,
      plateauW: 0.42 + r() * 0.30,
      sunx,
      sunHi: 0.04 + r() * 0.12,
      gates: K.rint(r, 5, 9),
      rays: K.rint(r, 4, 7),
      craft: K.rint(r, 6, 14),
      contrails: K.rint(r, 5, 10),
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Hour: p.time, Traffic: p.traffic, Gates: p.gates };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const HZ = H * p.horizon;
    const sunX = W * p.sunx, sunY = HZ - H * p.sunHi;
    const dawn = p.time === 'First Light', last = p.time === 'Last Light', noon = p.time === 'High Sun';
    const warm = noon ? 0.34 : last ? 0.62 : dawn ? 0.46 : 0.54; // horizon gold strength

    // ── 1. SKY gradient: cool cyan/lavender zenith → warm peach-gold horizon glow.
    const g = x.createLinearGradient(0, 0, 0, HZ + H * 0.12);
    g.addColorStop(0, K.mix(P.sky0, P.lav, 0.30));
    g.addColorStop(0.42, K.mix(P.sky1, P.lav, 0.18));
    g.addColorStop(0.78, K.mix(P.sky1, P.sky2, warm));
    g.addColorStop(1, K.mix(P.sky2, P.cream, 0.30));
    x.fillStyle = g; x.fillRect(0, 0, W, HZ + H * 0.14);

    // lower half: the endless cloud SEA below the horizon — peach/lavender wash
    const gs = x.createLinearGradient(0, HZ, 0, H);
    gs.addColorStop(0, K.mix(P.sky2, P.cream, 0.34));
    gs.addColorStop(0.30, K.mix(P.sky2, P.lav, 0.28));
    gs.addColorStop(1, K.mix(P.lav, P.sky0, 0.42));
    x.fillStyle = gs; x.fillRect(0, HZ, W, H - HZ);

    // ── 2. SUN: a soft luminous disc + broad glow bleeding into the sky.
    K.bloom(x, sunX, sunY, Math.max(W, H) * (0.30 + warm * 0.12), P.gold, 0.05 + warm * 0.05);
    K.bloom(x, sunX, sunY, Math.min(W, H) * 0.17, P.cream, 0.10 + warm * 0.05);
    K.bloom(x, sunX, sunY, Math.min(W, H) * 0.055, '#ffffff', 0.22);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = K.rgba(P.cream, 0.7);
    x.beginPath(); x.arc(sunX, sunY, Math.min(W, H) * 0.022, 0, 7); x.fill();
    x.restore();

    // ── 3. BACKGROUND cloud sea (far): low-contrast hazy fbm bands, desaturated,
    // hugging the horizon. Atmospheric perspective — far = pale & flat.
    function cloudBand(yc, thick, col, alpha, scale, ox) {
      x.save(); x.globalCompositeOperation = 'screen';
      const step = Math.max(4, Math.floor(W / 280));
      const c = K.h2r(col);
      for (let xx = 0; xx < W; xx += step) {
        const top = yc + noise.fbm((xx + ox) / scale, yc / scale, 4) * thick * 0.5;
        for (let yy = top; yy < yc + thick; yy += step) {
          const d = 1 - (yy - top) / thick;
          const nn = (noise.fbm((xx + ox) / (scale * 0.6), yy / (scale * 0.6), 5) + 1) / 2;
          const a = K.clamp(nn * d * alpha, 0, 1);
          if (a < 0.012) continue;
          x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();
    }
    // far haze layers just above + at the horizon
    cloudBand(HZ - H * 0.10, H * 0.16, K.mix(P.lav, P.cream, 0.5), 0.22, 220, seed * 7);
    cloudBand(HZ - H * 0.02, H * 0.12, K.mix(P.sky2, P.cream, 0.45), 0.30, 180, seed * 13);

    // ── 4. GOD-RAYS: broad soft light shafts from the sun, raking down through fog.
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.rays; i++) {
      const ang = (-Math.PI / 2) + (i - p.rays / 2) * (0.10 + r() * 0.06) + (r() - 0.5) * 0.05;
      const len = H * (0.9 + r() * 0.6);
      const wBeam = W * (0.03 + r() * 0.06);
      const ex = sunX + Math.cos(ang) * len, ey = sunY - Math.sin(ang) * len;
      // perpendicular for beam width
      const px = Math.cos(ang + Math.PI / 2), py = -Math.sin(ang + Math.PI / 2);
      const grd = x.createLinearGradient(sunX, sunY, ex, ey);
      grd.addColorStop(0, K.rgba(P.cream, 0.16));
      grd.addColorStop(0.5, K.rgba(P.gold, 0.07));
      grd.addColorStop(1, K.rgba(P.gold, 0));
      x.fillStyle = grd;
      x.beginPath();
      x.moveTo(sunX, sunY);
      x.lineTo(ex + px * wBeam, ey + py * wBeam);
      x.lineTo(ex - px * wBeam, ey - py * wBeam);
      x.closePath(); x.fill();
    }
    x.restore();

    // ── 5. CONTRAILS: thin fading arcs crisscrossing the sky, perspective-faded.
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < p.contrails; i++) {
      const depth = r(); // 0 far/pale .. 1 near/crisp
      const y0 = HZ - H * (0.05 + r() * 0.55);
      const x0 = -W * 0.1 + r() * W * 0.3 * (r() < 0.5 ? 1 : -1) + (r() < 0.5 ? 0 : W);
      const sx = (r() < 0.5 ? 1 : -1);
      const span = W * (0.5 + r() * 0.7);
      const bow = (r() - 0.5) * H * 0.18;
      const segs = 36;
      x.beginPath();
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const xx = x0 + sx * span * t;
        const yy = y0 + Math.sin(t * Math.PI) * bow + (t - 0.5) * H * 0.04 * (r() < 0.5 ? 1 : -1);
        if (s === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy);
      }
      x.strokeStyle = K.rgba(P.cream, 0.05 + depth * 0.16);
      x.lineWidth = 0.6 + depth * 2.4;
      x.lineCap = 'round';
      x.stroke();
      // faint warm under-edge
      x.strokeStyle = K.rgba(P.gold, 0.03 + depth * 0.06);
      x.lineWidth = 0.5 + depth * 1.2;
      x.stroke();
    }
    x.restore();

    // ── 6. CLOUD PLATEAU: the floating cloud-island the terminal perches on.
    // A billowing mound of peach/lavender fbm cloud, lit warm on the sun side.
    const plX = W * p.plateauX, plW = W * p.plateauW;
    const plTop = HZ - H * 0.02, plBot = H * 0.92;
    function plateau(cx, cw, topY, botY, lit) {
      x.save(); x.globalCompositeOperation = 'screen';
      const step = Math.max(3, Math.floor(W / 360));
      for (let xx = cx - cw / 2; xx < cx + cw / 2; xx += step) {
        const u = (xx - (cx - cw / 2)) / cw; // 0..1 across
        const edge = Math.sin(u * Math.PI); // 0 at edges, 1 center
        const surf = topY - edge * H * 0.10 + noise.fbm(xx / 90, seed * 3, 5) * H * 0.05;
        for (let yy = surf; yy < botY; yy += step) {
          const dd = (yy - surf) / (botY - surf);
          const nn = (noise.fbm(xx / 70, yy / 70, 5) + 1) / 2;
          // warm on sun side, cool lavender shadow on far side
          const sunSide = (sunX > cx) ? (xx - (cx - cw / 2)) / cw : 1 - (xx - (cx - cw / 2)) / cw;
          const col = K.mix(K.mix(P.lav, P.sky2, sunSide * 0.7 * lit), P.cream, edge * 0.25);
          const a = K.clamp(nn * (0.5 + edge * 0.5) * (1 - dd * 0.5) * 0.6, 0, 1);
          if (a < 0.02) continue;
          x.fillStyle = K.rgba(col, a);
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();
    }
    plateau(plX, plW, plTop, plBot, warm);

    // ── 7. THE TERMINAL: pale glass-and-girder concourse perched on the plateau.
    // A long horizontal structure mid-frame: deck slab, glass curtain wall with
    // a row of departure gates, a roof truss line, jet-bridges reaching out. Hazy.
    const deckY = plTop - H * 0.01;       // top of the cloud the terminal sits on
    const termY = deckY - H * 0.14;        // building top
    const termL = plX - plW * 0.42, termR = plX + plW * 0.42;
    const termW = termR - termL;
    const glassH = deckY - termY;

    x.save();
    // deck slab (thin lit edge of the platform the terminal stands on)
    x.fillStyle = K.rgba(K.mix(P.glass, P.cream, 0.4), 0.5);
    x.fillRect(termL, deckY - H * 0.012, termW, H * 0.016);
    x.fillStyle = K.rgba(K.mix(P.lav, P.glass, 0.5), 0.35);
    x.fillRect(termL, deckY, termW, H * 0.018);

    // soft drop-shadow under the terminal so it reads as a solid mass on the cloud
    x.fillStyle = K.rgba(K.mix(P.lav, '#2a2440', 0.5), 0.28);
    x.fillRect(termL - termW * 0.01, deckY - H * 0.004, termW * 1.02, H * 0.03);
    // glass curtain body — deeper lavender glass so it reads against the bright
    // sky (a legible silhouette), warm sheen toward the sun
    const bodyG = x.createLinearGradient(termL, termY, termR, termY);
    const lo = sunX < plX ? 0 : 1;
    bodyG.addColorStop(0, K.rgba(K.mix(P.glass, lo === 0 ? P.cream : P.lav, 0.6), 0.62));
    bodyG.addColorStop(0.5, K.rgba(K.mix(P.glass, P.lav, 0.32), 0.56));
    bodyG.addColorStop(1, K.rgba(K.mix(P.glass, lo === 1 ? P.cream : P.lav, 0.6), 0.62));
    x.fillStyle = bodyG;
    x.fillRect(termL, termY, termW, glassH);

    // roof line — a thin bright truss with a gentle camber
    x.strokeStyle = K.rgba(K.mix(P.cream, P.gold, 0.4), 0.5);
    x.lineWidth = Math.max(1.5, H * 0.004);
    x.beginPath();
    x.moveTo(termL, termY + H * 0.006);
    x.quadraticCurveTo(plX, termY - H * 0.02, termR, termY + H * 0.006);
    x.stroke();
    // roof underside shadow
    x.strokeStyle = K.rgba(P.lav, 0.25);
    x.lineWidth = Math.max(1, H * 0.003);
    x.beginPath();
    x.moveTo(termL, termY + H * 0.012);
    x.quadraticCurveTo(plX, termY - H * 0.014, termR, termY + H * 0.012);
    x.stroke();

    // GATES: a row of mullions + lit gate openings down the curtain wall
    const gateW = termW / p.gates;
    for (let i = 0; i <= p.gates; i++) {
      const gx = termL + i * gateW;
      // vertical mullion
      x.strokeStyle = K.rgba(K.mix(P.glass, P.lav, 0.4), 0.4);
      x.lineWidth = Math.max(1, H * 0.0025);
      x.beginPath(); x.moveTo(gx, termY + H * 0.006); x.lineTo(gx, deckY - H * 0.01); x.stroke();
    }
    // horizontal floor band (mezzanine line)
    x.strokeStyle = K.rgba(K.mix(P.glass, P.cyan, 0.3), 0.3);
    x.lineWidth = Math.max(0.8, H * 0.002);
    x.beginPath(); x.moveTo(termL, termY + glassH * 0.5); x.lineTo(termR, termY + glassH * 0.5); x.stroke();

    // lit gate interiors — warm glow behind some panes
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.gates; i++) {
      if (r() < 0.35) continue;
      const gx = termL + (i + 0.5) * gateW;
      const gy = termY + glassH * (0.5 + r() * 0.4);
      const gc = r() < 0.3 ? P.cyan : P.gold;
      x.fillStyle = K.rgba(K.mix(gc, P.cream, 0.4), 0.18 + r() * 0.2);
      x.fillRect(gx - gateW * 0.36, gy - glassH * 0.12, gateW * 0.72, glassH * 0.18);
      K.bloom(x, gx, gy, gateW * 0.7, gc, 0.12);
    }
    // overall glass sheen toward the sun
    K.sheen(x, sunX < plX ? termL + termW * 0.18 : termR - termW * 0.18, termY + glassH * 0.4,
      termW * 0.5, P.cream, 0.16);
    x.restore();

    // ── 8. CONTROL TOWER (sometimes) — a tall thin stalk rising off the plateau,
    // surreal vertical accent, hazier the taller it goes.
    if (r() < 0.65) {
      x.save();
      const twX = plX + (r() - 0.5) * plW * 0.5;
      const twBase = termY + H * 0.01, twTop = twBase - H * (0.16 + r() * 0.12);
      const twW = Math.max(3, W * 0.008);
      const tg = x.createLinearGradient(0, twTop, 0, twBase);
      tg.addColorStop(0, K.rgba(K.mix(P.glass, P.cream, 0.4), 0.32));
      tg.addColorStop(1, K.rgba(P.glass, 0.5));
      x.fillStyle = tg;
      x.fillRect(twX - twW / 2, twTop, twW, twBase - twTop);
      // cab at the top — wider, lit
      x.fillStyle = K.rgba(K.mix(P.glass, P.cyan, 0.3), 0.55);
      x.fillRect(twX - twW * 1.6, twTop - twW * 1.2, twW * 3.2, twW * 2.4);
      K.bloom(x, twX, twTop, twW * 4, P.cyan, 0.16);
      x.restore();
    }

    // ── 9. JET-BRIDGES reaching off the deck into open sky (the surreal "ends
    // in nothing" cue) — thin lit gangways jutting out over the cloud void.
    x.save();
    const bridges = K.rint(r, 2, 4);
    for (let i = 0; i < bridges; i++) {
      const bx0 = termL + (0.2 + r() * 0.6) * termW;
      const by0 = deckY - H * 0.005;
      const dir = bx0 < plX ? -1 : 1;
      const bl = W * (0.06 + r() * 0.10);
      const bx1 = bx0 + dir * bl, by1 = by0 + H * (0.01 + r() * 0.02);
      x.strokeStyle = K.rgba(K.mix(P.glass, P.cream, 0.35), 0.45);
      x.lineWidth = Math.max(2.5, H * 0.008);
      x.beginPath(); x.moveTo(bx0, by0); x.lineTo(bx1, by1); x.stroke();
      // tiny moth-sized plane parked at the END of the bridge (scale surreal)
      const pw = Math.max(6, W * (0.014 + r() * 0.01));
      x.fillStyle = K.rgba(K.mix(P.cream, P.gold, 0.3), 0.7);
      // fuselage
      x.fillRect(bx1 - pw * 0.5, by1 - pw * 0.12, pw, pw * 0.24);
      // wing
      x.fillStyle = K.rgba(K.mix(P.glass, P.lav, 0.3), 0.6);
      x.fillRect(bx1 - pw * 0.1, by1 - pw * 0.05, pw * 0.5, pw * 0.5);
      // tail
      x.beginPath();
      x.moveTo(bx1 - pw * 0.5, by1 - pw * 0.12);
      x.lineTo(bx1 - pw * 0.62, by1 - pw * 0.4);
      x.lineTo(bx1 - pw * 0.4, by1 - pw * 0.12);
      x.closePath(); x.fillStyle = K.rgba(P.cream, 0.6); x.fill();
    }
    x.restore();

    // ── 10. RUNWAY that just ENDS in sky — a pale tapering strip on the plateau
    // edge running toward the void, with centre-line dashes, dissolving to haze.
    if (r() < 0.7) {
      x.save();
      const rwDir = (sunX > plX) ? 1 : -1;
      const rwX0 = plX, rwY0 = deckY + H * 0.02;
      const rwX1 = plX + rwDir * plW * 0.5, rwY1 = deckY - H * 0.04; // recedes & lifts
      // tapering strip
      x.beginPath();
      x.moveTo(rwX0 - W * 0.05, rwY0);
      x.lineTo(rwX0 + W * 0.05, rwY0);
      x.lineTo(rwX1 + W * 0.006, rwY1);
      x.lineTo(rwX1 - W * 0.006, rwY1);
      x.closePath();
      const rg = x.createLinearGradient(rwX0, rwY0, rwX1, rwY1);
      rg.addColorStop(0, K.rgba(K.mix(P.glass, P.lav, 0.3), 0.4));
      rg.addColorStop(1, K.rgba(P.glass, 0)); // ends in nothing
      x.fillStyle = rg; x.fill();
      // centre-line dashes
      x.globalCompositeOperation = 'lighter';
      for (let t = 0.05; t < 0.92; t += 0.12) {
        const dx = rwX0 + (rwX1 - rwX0) * t, dy = rwY0 + (rwY1 - rwY0) * t;
        x.fillStyle = K.rgba(P.cream, 0.4 * (1 - t));
        x.fillRect(dx - 1.5, dy - 3 * (1 - t * 0.6), 3, 8 * (1 - t * 0.6));
      }
      x.restore();
    }

    // ── 11. FLOCK OF CRAFT: small plane silhouettes / bloom dots scattered in
    // the sky at varying depths — far = pale specks, near = crisp little darts.
    x.save();
    for (let i = 0; i < p.craft; i++) {
      const depth = r(); // 0 far .. 1 near
      const cxp = r() * W;
      const cyp = r() * (HZ - H * 0.02) + H * 0.02;
      const sz = (2 + depth * depth * 16) * (0.7 + r() * 0.6);
      const dir = r() < 0.5 ? 1 : -1;
      const ang = (r() - 0.5) * 0.5;
      // bloom halo (catching sun)
      K.bloom(x, cxp, cyp, sz * (1.4 + depth), P.cream, 0.10 + depth * 0.12);
      // silhouette: fuselage + swept wings as a little dart
      x.save();
      x.translate(cxp, cyp); x.rotate(ang);
      const col = K.rgba(K.mix(P.lav, '#3a3a55', 0.5), 0.25 + depth * 0.45);
      x.fillStyle = col;
      // fuselage
      x.fillRect(-sz * 0.5 * dir, -sz * 0.06, sz * dir, sz * 0.12);
      // wings (swept back)
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(-sz * 0.35 * dir, -sz * 0.4);
      x.lineTo(-sz * 0.15 * dir, 0);
      x.lineTo(-sz * 0.35 * dir, sz * 0.4);
      x.closePath(); x.fill();
      // a faint contrail trailing the nearer craft
      if (depth > 0.4) {
        x.globalCompositeOperation = 'screen';
        x.strokeStyle = K.rgba(P.cream, 0.10 * depth);
        x.lineWidth = sz * 0.10;
        x.beginPath();
        x.moveTo(-sz * 0.5 * dir, 0);
        x.lineTo(-sz * (2.5 + r() * 3) * dir, sz * 0.1);
        x.stroke();
      }
      x.restore();
    }
    x.restore();

    // ── 12. FOREGROUND cloud wisps drifting across the lower frame (near, soft,
    // big-scale) — these frame the scene and add the closest depth plane.
    cloudBand(H * 0.78, H * 0.30, K.mix(P.sky2, P.cream, 0.5), 0.42, 150, seed * 21 + 100);
    cloudBand(H * 0.62, H * 0.22, K.mix(P.lav, P.cream, 0.4), 0.30, 200, seed * 31 + 50);

    // ── 13. ATMOSPHERE finish: signature haze sheet, soft bloom wash, grain,
    // gentle vignette. Keep it luminous & high-key.
    K.hazeSheet(x, W, H, noise, K.mix(P.cream, P.gold, 0.3), noon ? 0.10 : 0.14, 320, 'screen');
    // big soft warm bloom over the whole sun side for dreamy glow (restrained)
    K.bloom(x, sunX, sunY + H * 0.05, Math.max(W, H) * 0.5, P.gold, 0.03 + warm * 0.025);
    // cool counter-wash on the shadow side
    x.save(); x.globalCompositeOperation = 'screen';
    const cw = x.createLinearGradient(sunX < W / 2 ? W : 0, 0, sunX < W / 2 ? 0 : W, 0);
    cw.addColorStop(0, K.rgba(P.lav, 0.10));
    cw.addColorStop(1, K.rgba(P.lav, 0));
    x.fillStyle = cw; x.fillRect(0, 0, W, H);
    x.restore();

    K.grain(x, W, H, 520, r);
    K.vignette(x, W, H, 0.40);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'concourse', draw, traits };
})();
