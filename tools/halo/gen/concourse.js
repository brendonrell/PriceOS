/* CONCOURSE — a surreal airport concourse floating in an endless cloud sea.
 * Departure gates, jet-bridges and glass walls perched on a cloud-island at
 * golden hour. Contrails crisscross a deep luminous sky; god-rays shaft down
 * through fog; a flock of craft drift as bloom-haloed silhouettes. The runway
 * just ends in sky, gates open onto clouds, and the plane parked at the gate is
 * the size of a moth. Serene, high-key, dreamy.
 * PALETTE: GOLDEN CLOUDPORT — peach-gold / sky cyan / soft lavender. Warm light,
 * cool shadows. Read like a Turner sky with a glass terminal floating in it.
 *
 * LAYOUT AXIS (seed-picked, 6 structurally distinct PICTURES):
 *   Plateau City  — terminal centred on its cloud plateau, classic establishing.
 *   Vast Restraint— terminal far & tiny against a near-empty cloud sea.
 *   Gate Reach    — close gate + jet-bridge reaching out into the void (hero).
 *   Runway's End  — the runway as the hero diagonal, ending in open sky.
 *   The Flock     — a swarm of craft is the subject, terminal a sliver.
 *   God-Rays      — light shafts dominate; architecture in silhouette.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Golden Cloudport', sky0: '#7fb8e8', sky1: '#b9c4ee', sky2: '#ffcf7a', gold: '#ffcf7a', cyan: '#6fd6ff', lav: '#b9a6e8', glass: '#d8c8e8', cream: '#fff4dc' },
    { name: 'Peach Dawn',       sky0: '#8fb0dd', sky1: '#d4bce0', sky2: '#ffc48a', gold: '#ffd28a', cyan: '#7fd0ff', lav: '#c0a8e6', glass: '#e2cfe2', cream: '#fff6e2' },
    { name: 'Cyan Plateau',     sky0: '#6fb6e8', sky1: '#a8c8ee', sky2: '#ffd89a', gold: '#ffd28c', cyan: '#5fd0ff', lav: '#aea0e2', glass: '#cfe0f0', cream: '#fff8e8' },
    { name: 'Lavender Drift',   sky0: '#92a8e0', sky1: '#c4b0e8', sky2: '#ffc880', gold: '#ffcb80', cyan: '#82caf6', lav: '#c4a8ec', glass: '#ddccec', cream: '#fff3d8' },
    { name: 'Amber Stratos',    sky0: '#7caedd', sky1: '#bcc0e6', sky2: '#ffbf6e', gold: '#ffc46e', cyan: '#6cccfa', lav: '#b6a2e4', glass: '#d6c6e6', cream: '#fff0d0' },
    { name: 'High Noon Haze',   sky0: '#8cc0ee', sky1: '#cdd6f4', sky2: '#ffe0a8', gold: '#ffdca0', cyan: '#74d8ff', lav: '#c2b2ea', glass: '#e4dcf0', cream: '#fffaee' },
  ];

  // Each layout owns its own format bias so the *frame shape* changes too.
  const LAYOUTS = ['Plateau City', 'Vast Restraint', 'Gate Reach', "Runway's End", 'The Flock', 'God-Rays'];
  const TIMES = ['Golden Hour', 'First Light', 'High Sun', 'Last Light'];

  function fmtFor(layout, r) {
    switch (layout) {
      case 'Vast Restraint': return K.pick([{ W: 1480, H: 980, t: 'Pano' }, { W: 1480, H: 1100, t: 'Wide' }], r);
      case 'Gate Reach':     return K.pick([{ W: 1180, H: 1420, t: 'Tower' }, { W: 1240, H: 1240, t: 'Square' }], r);
      case "Runway's End":   return K.pick([{ W: 1480, H: 1100, t: 'Wide' }, { W: 1240, H: 1240, t: 'Square' }], r);
      case 'The Flock':      return K.pick([{ W: 1240, H: 1240, t: 'Square' }, { W: 1480, H: 1100, t: 'Wide' }], r);
      case 'God-Rays':       return K.pick([{ W: 1180, H: 1420, t: 'Tower' }, { W: 1240, H: 1240, t: 'Square' }], r);
      default:               return K.pick([{ W: 1480, H: 1100, t: 'Wide' }, { W: 1240, H: 1240, t: 'Square' }], r);
    }
  }

  function params(r) {
    const layout = K.pick(LAYOUTS, r);
    const fmt = fmtFor(layout, r);
    const pal = K.pick(PALS, r);
    const time = K.pick(TIMES, r);

    // Horizon is layout-driven (this is what makes the camera differ).
    let horizon;
    switch (layout) {
      case 'Vast Restraint': horizon = 0.30 + r() * 0.06; break; // high horizon, huge cloud sea below
      case 'Gate Reach':     horizon = 0.40 + r() * 0.10; break;
      case "Runway's End":   horizon = 0.34 + r() * 0.10; break;
      case 'The Flock':      horizon = 0.62 + r() * 0.12; break; // low horizon, big sky for craft
      case 'God-Rays':       horizon = 0.52 + r() * 0.12; break;
      default:               horizon = 0.46 + (r() - 0.5) * 0.16;
    }

    const plateauX = 0.30 + r() * 0.40;
    const sunx = plateauX < 0.5 ? 0.64 + r() * 0.28 : 0.08 + r() * 0.28;
    return {
      layout, pal, fmt, time,
      horizon,
      plateauX,
      plateauW: 0.42 + r() * 0.26,
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
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Hour: p.time, Gates: p.gates };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const L = p.layout;
    const HZ = H * p.horizon;
    const sunX = W * p.sunx, sunY = HZ - H * p.sunHi;
    const dawn = p.time === 'First Light', last = p.time === 'Last Light', noon = p.time === 'High Sun';
    const warm = noon ? 0.34 : last ? 0.62 : dawn ? 0.46 : 0.54;

    // ════════ SHARED ATMOSPHERE PRIMITIVES ════════

    function sky() {
      const g = x.createLinearGradient(0, 0, 0, HZ + H * 0.12);
      g.addColorStop(0, K.mix(P.sky0, P.lav, 0.30));
      g.addColorStop(0.42, K.mix(P.sky1, P.lav, 0.18));
      g.addColorStop(0.78, K.mix(P.sky1, P.sky2, warm));
      g.addColorStop(1, K.mix(P.sky2, P.cream, 0.30));
      x.fillStyle = g; x.fillRect(0, 0, W, HZ + H * 0.14);

      const gs = x.createLinearGradient(0, HZ, 0, H);
      gs.addColorStop(0, K.mix(P.sky2, P.cream, 0.34));
      gs.addColorStop(0.30, K.mix(P.sky2, P.lav, 0.28));
      gs.addColorStop(1, K.mix(P.lav, P.sky0, 0.42));
      x.fillStyle = gs; x.fillRect(0, HZ, W, H - HZ);
    }

    function sun(scale) {
      scale = scale || 1;
      K.bloom(x, sunX, sunY, Math.max(W, H) * (0.30 + warm * 0.12) * scale, P.gold, 0.05 + warm * 0.05);
      K.bloom(x, sunX, sunY, Math.min(W, H) * 0.17 * scale, P.cream, 0.10 + warm * 0.05);
      K.bloom(x, sunX, sunY, Math.min(W, H) * 0.055 * scale, '#ffffff', 0.22);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(P.cream, 0.7);
      x.beginPath(); x.arc(sunX, sunY, Math.min(W, H) * 0.022 * scale, 0, 7); x.fill();
      x.restore();
    }

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

    function farHaze() {
      cloudBand(HZ - H * 0.10, H * 0.16, K.mix(P.lav, P.cream, 0.5), 0.22, 220, seed * 7);
      cloudBand(HZ - H * 0.02, H * 0.12, K.mix(P.sky2, P.cream, 0.45), 0.30, 180, seed * 13);
    }

    function godrays(intensity) {
      intensity = intensity || 1;
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < p.rays; i++) {
        const ang = (-Math.PI / 2) + (i - p.rays / 2) * (0.10 + r() * 0.06) + (r() - 0.5) * 0.05;
        const len = H * (0.9 + r() * 0.6);
        const wBeam = W * (0.03 + r() * 0.06) * intensity;
        const ex = sunX + Math.cos(ang) * len, ey = sunY - Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2), py = -Math.sin(ang + Math.PI / 2);
        const grd = x.createLinearGradient(sunX, sunY, ex, ey);
        grd.addColorStop(0, K.rgba(P.cream, 0.16 * intensity));
        grd.addColorStop(0.5, K.rgba(P.gold, 0.07 * intensity));
        grd.addColorStop(1, K.rgba(P.gold, 0));
        x.fillStyle = grd;
        x.beginPath();
        x.moveTo(sunX, sunY);
        x.lineTo(ex + px * wBeam, ey + py * wBeam);
        x.lineTo(ex - px * wBeam, ey - py * wBeam);
        x.closePath(); x.fill();
      }
      x.restore();
    }

    function contrails(n) {
      x.save(); x.globalCompositeOperation = 'screen';
      for (let i = 0; i < n; i++) {
        const depth = r();
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
        x.strokeStyle = K.rgba(P.gold, 0.03 + depth * 0.06);
        x.lineWidth = 0.5 + depth * 1.2;
        x.stroke();
      }
      x.restore();
    }

    // a little dart-craft silhouette centred at (0,0) in current transform
    function dart(sz, dir, depth) {
      K.bloom(x, 0, 0, sz * (1.4 + depth), P.cream, 0.10 + depth * 0.12);
      x.fillStyle = K.rgba(K.mix(P.lav, '#3a3a55', 0.5), 0.25 + depth * 0.45);
      x.fillRect(-sz * 0.5 * dir, -sz * 0.06, sz * dir, sz * 0.12);
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(-sz * 0.35 * dir, -sz * 0.4);
      x.lineTo(-sz * 0.15 * dir, 0);
      x.lineTo(-sz * 0.35 * dir, sz * 0.4);
      x.closePath(); x.fill();
    }

    function flock(n, ymax) {
      x.save();
      for (let i = 0; i < n; i++) {
        const depth = r();
        const cxp = r() * W;
        const cyp = r() * (ymax - H * 0.02) + H * 0.02;
        const sz = (2 + depth * depth * 16) * (0.7 + r() * 0.6);
        const dir = r() < 0.5 ? 1 : -1;
        const ang = (r() - 0.5) * 0.5;
        x.save();
        x.translate(cxp, cyp); x.rotate(ang);
        dart(sz, dir, depth);
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
    }

    // a cloud plateau mound centred cx, half-width hw, lit from sun side
    function plateau(cx, cw, topY, botY, lit) {
      x.save(); x.globalCompositeOperation = 'screen';
      const step = Math.max(3, Math.floor(W / 360));
      for (let xx = cx - cw / 2; xx < cx + cw / 2; xx += step) {
        const u = (xx - (cx - cw / 2)) / cw;
        const edge = Math.sin(u * Math.PI);
        const surf = topY - edge * H * 0.10 + noise.fbm(xx / 90, seed * 3, 5) * H * 0.05;
        for (let yy = surf; yy < botY; yy += step) {
          const dd = (yy - surf) / (botY - surf);
          const nn = (noise.fbm(xx / 70, yy / 70, 5) + 1) / 2;
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

    // The glass terminal. Drawn relative to a centre cx, deck top deckY, with a
    // width tw and glass height gh. Returns deck Y for hanging bridges/runway.
    function terminal(cx, deckY, tw, gh, detail) {
      const termL = cx - tw / 2, termR = cx + tw / 2, termW = tw;
      const termY = deckY - gh;
      x.save();
      // deck slabs
      x.fillStyle = K.rgba(K.mix(P.glass, P.cream, 0.4), 0.5);
      x.fillRect(termL, deckY - gh * 0.085, termW, gh * 0.11);
      x.fillStyle = K.rgba(K.mix(P.lav, P.glass, 0.5), 0.35);
      x.fillRect(termL, deckY, termW, gh * 0.13);
      // drop shadow
      x.fillStyle = K.rgba(K.mix(P.lav, '#2a2440', 0.5), 0.28);
      x.fillRect(termL - termW * 0.01, deckY - gh * 0.03, termW * 1.02, gh * 0.22);
      // glass body
      const bodyG = x.createLinearGradient(termL, termY, termR, termY);
      const lo = sunX < cx ? 0 : 1;
      bodyG.addColorStop(0, K.rgba(K.mix(P.glass, lo === 0 ? P.cream : P.lav, 0.6), 0.62));
      bodyG.addColorStop(0.5, K.rgba(K.mix(P.glass, P.lav, 0.32), 0.56));
      bodyG.addColorStop(1, K.rgba(K.mix(P.glass, lo === 1 ? P.cream : P.lav, 0.6), 0.62));
      x.fillStyle = bodyG;
      x.fillRect(termL, termY, termW, gh);
      // roof truss
      x.strokeStyle = K.rgba(K.mix(P.cream, P.gold, 0.4), 0.5);
      x.lineWidth = Math.max(1.5, gh * 0.03);
      x.beginPath();
      x.moveTo(termL, termY + gh * 0.04);
      x.quadraticCurveTo(cx, termY - gh * 0.14, termR, termY + gh * 0.04);
      x.stroke();
      x.strokeStyle = K.rgba(P.lav, 0.25);
      x.lineWidth = Math.max(1, gh * 0.02);
      x.beginPath();
      x.moveTo(termL, termY + gh * 0.08);
      x.quadraticCurveTo(cx, termY - gh * 0.10, termR, termY + gh * 0.08);
      x.stroke();
      // mullions
      const gateW = termW / p.gates;
      for (let i = 0; i <= p.gates; i++) {
        const gx = termL + i * gateW;
        x.strokeStyle = K.rgba(K.mix(P.glass, P.lav, 0.4), 0.4);
        x.lineWidth = Math.max(1, gh * 0.018);
        x.beginPath(); x.moveTo(gx, termY + gh * 0.04); x.lineTo(gx, deckY - gh * 0.06); x.stroke();
      }
      // mezzanine line
      x.strokeStyle = K.rgba(K.mix(P.glass, P.cyan, 0.3), 0.3);
      x.lineWidth = Math.max(0.8, gh * 0.014);
      x.beginPath(); x.moveTo(termL, termY + gh * 0.5); x.lineTo(termR, termY + gh * 0.5); x.stroke();
      // lit gates
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < p.gates; i++) {
        if (r() < 0.35) continue;
        const gx = termL + (i + 0.5) * gateW;
        const gy = termY + gh * (0.5 + r() * 0.4);
        const gc = r() < 0.3 ? P.cyan : P.gold;
        x.fillStyle = K.rgba(K.mix(gc, P.cream, 0.4), 0.18 + r() * 0.2);
        x.fillRect(gx - gateW * 0.36, gy - gh * 0.12, gateW * 0.72, gh * 0.18);
        K.bloom(x, gx, gy, gateW * 0.7, gc, 0.12);
      }
      K.sheen(x, sunX < cx ? termL + termW * 0.18 : termR - termW * 0.18, termY + gh * 0.4,
        termW * 0.5, P.cream, 0.16);
      x.restore();
      return { termL, termR, termY, deckY, gateW };
    }

    function controlTower(cx, baseY, h) {
      x.save();
      const twW = Math.max(3, W * 0.008);
      const twTop = baseY - h;
      const tg = x.createLinearGradient(0, twTop, 0, baseY);
      tg.addColorStop(0, K.rgba(K.mix(P.glass, P.cream, 0.4), 0.32));
      tg.addColorStop(1, K.rgba(P.glass, 0.5));
      x.fillStyle = tg;
      x.fillRect(cx - twW / 2, twTop, twW, baseY - twTop);
      x.fillStyle = K.rgba(K.mix(P.glass, P.cyan, 0.3), 0.55);
      x.fillRect(cx - twW * 1.6, twTop - twW * 1.2, twW * 3.2, twW * 2.4);
      K.bloom(x, cx, twTop, twW * 4, P.cyan, 0.16);
      x.restore();
    }

    // a single jet-bridge + moth plane, from (bx0,by0) reaching dir*len
    function jetBridge(bx0, by0, dir, len, drop, thick) {
      x.save();
      const bx1 = bx0 + dir * len, by1 = by0 + drop;
      x.strokeStyle = K.rgba(K.mix(P.glass, P.cream, 0.35), 0.5);
      x.lineWidth = thick;
      x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx0, by0); x.lineTo(bx1, by1); x.stroke();
      // support strut underside
      x.strokeStyle = K.rgba(P.lav, 0.3);
      x.lineWidth = thick * 0.4;
      x.beginPath(); x.moveTo(bx0, by0 + thick * 0.5); x.lineTo(bx1, by1 + thick * 0.5); x.stroke();
      // moth plane at the tip
      const pw = Math.max(8, thick * 2.4);
      x.fillStyle = K.rgba(K.mix(P.cream, P.gold, 0.3), 0.75);
      x.fillRect(bx1 - pw * 0.5, by1 - pw * 0.12, pw, pw * 0.24);
      x.fillStyle = K.rgba(K.mix(P.glass, P.lav, 0.3), 0.6);
      x.fillRect(bx1 - pw * 0.1, by1 - pw * 0.05, pw * 0.5, pw * 0.5);
      x.beginPath();
      x.moveTo(bx1 - pw * 0.5, by1 - pw * 0.12);
      x.lineTo(bx1 - pw * 0.62, by1 - pw * 0.4);
      x.lineTo(bx1 - pw * 0.4, by1 - pw * 0.12);
      x.closePath(); x.fillStyle = K.rgba(P.cream, 0.6); x.fill();
      x.restore();
    }

    // runway tapering strip from base toward void, dir horizontal, vanishing pt
    function runway(bx, by, vx, vy, halfW) {
      x.save();
      const tipW = halfW * 0.05;
      // solid tarmac deck — bold, opaque near edge fading only at the far tip
      x.beginPath();
      x.moveTo(bx - halfW, by);
      x.lineTo(bx + halfW, by);
      x.lineTo(vx + tipW, vy);
      x.lineTo(vx - tipW, vy);
      x.closePath();
      const rg = x.createLinearGradient(bx, by, vx, vy);
      rg.addColorStop(0, K.rgba(K.mix(P.glass, P.lav, 0.5), 0.82));
      rg.addColorStop(0.45, K.rgba(K.mix(P.glass, P.lav, 0.35), 0.6));
      rg.addColorStop(0.85, K.rgba(K.mix(P.glass, P.cream, 0.4), 0.22));
      rg.addColorStop(1, K.rgba(P.cream, 0)); // ends in nothing
      x.fillStyle = rg; x.fill();
      // bright lit far lip where it meets the sky (the "ends in air" glow)
      x.globalCompositeOperation = 'lighter';
      K.bloom(x, vx, vy, halfW * 0.8, P.cream, 0.28);
      x.globalCompositeOperation = 'source-over';
      // crisp white shoulder lines
      x.strokeStyle = K.rgba(P.cream, 0.55);
      x.lineWidth = Math.max(2, W * 0.0026);
      x.beginPath(); x.moveTo(bx - halfW, by); x.lineTo(vx - tipW, vy); x.stroke();
      x.beginPath(); x.moveTo(bx + halfW, by); x.lineTo(vx + tipW, vy); x.stroke();
      // threshold bars at the near end
      for (let k = -3; k <= 3; k++) {
        x.fillStyle = K.rgba(P.cream, 0.5);
        x.fillRect(bx + k * halfW * 0.22, by - halfW * 0.12, halfW * 0.08, halfW * 0.14);
      }
      // centre dashes receding
      x.globalCompositeOperation = 'lighter';
      for (let t = 0.06; t < 0.92; t += 0.085) {
        const dx = bx + (vx - bx) * t, dy = by + (vy - by) * t;
        const s = (1 - t * 0.7);
        x.fillStyle = K.rgba(P.cream, 0.65 * (1 - t * 0.7));
        x.fillRect(dx - halfW * 0.018 * s, dy, halfW * 0.036 * s, halfW * 0.10 * s);
      }
      // approach edge lights — warm dots down both shoulders
      for (let t = 0.08; t < 0.9; t += 0.13) {
        const s = (1 - t * 0.7);
        const lx = bx - halfW + (vx - tipW - (bx - halfW)) * t;
        const rx = bx + halfW + (vx + tipW - (bx + halfW)) * t;
        const ly = by + (vy - by) * t;
        K.bloom(x, lx, ly, halfW * 0.10 * s, P.gold, 0.3 * s);
        K.bloom(x, rx, ly, halfW * 0.10 * s, P.gold, 0.3 * s);
      }
      x.restore();
    }

    function foregroundWisps() {
      cloudBand(H * 0.78, H * 0.30, K.mix(P.sky2, P.cream, 0.5), 0.42, 150, seed * 21 + 100);
      cloudBand(H * 0.62, H * 0.22, K.mix(P.lav, P.cream, 0.4), 0.30, 200, seed * 31 + 50);
    }

    function finish() {
      K.hazeSheet(x, W, H, noise, K.mix(P.cream, P.gold, 0.3), noon ? 0.10 : 0.14, 320, 'screen');
      K.bloom(x, sunX, sunY + H * 0.05, Math.max(W, H) * 0.5, P.gold, 0.03 + warm * 0.025);
      x.save(); x.globalCompositeOperation = 'screen';
      const cw = x.createLinearGradient(sunX < W / 2 ? W : 0, 0, sunX < W / 2 ? 0 : W, 0);
      cw.addColorStop(0, K.rgba(P.lav, 0.10));
      cw.addColorStop(1, K.rgba(P.lav, 0));
      x.fillStyle = cw; x.fillRect(0, 0, W, H);
      x.restore();
      K.grain(x, W, H, 520, r);
      K.vignette(x, W, H, 0.40);
    }

    // ════════ LAYOUT COMPOSITIONS ════════
    sky();

    if (L === 'Plateau City') {
      // Establishing: full plateau centred, terminal mid-frame, balanced.
      sun(1);
      farHaze();
      godrays(0.8);
      contrails(p.contrails);
      const plX = W * (0.40 + r() * 0.20), plW = W * p.plateauW;
      const plTop = HZ + H * 0.02, plBot = H * 0.95;
      plateau(plX, plW, plTop, plBot, warm);
      const deckY = plTop - H * 0.01;
      const tw = plW * 0.78, gh = H * 0.13;
      const T = terminal(plX, deckY, tw, gh, true);
      if (r() < 0.7) controlTower(plX + (r() - 0.5) * tw * 0.4, T.termY + H * 0.01, H * (0.16 + r() * 0.10));
      const nb = K.rint(r, 2, 3);
      for (let i = 0; i < nb; i++) {
        const bx0 = T.termL + (0.2 + r() * 0.6) * tw;
        jetBridge(bx0, deckY - H * 0.005, bx0 < plX ? -1 : 1, W * (0.06 + r() * 0.08), H * 0.015, Math.max(2.5, H * 0.008));
      }
      if (r() < 0.6) {
        const dir = sunX > plX ? 1 : -1;
        runway(plX, deckY + H * 0.02, plX + dir * plW * 0.5, deckY - H * 0.05, W * 0.05);
      }
      flock(Math.round(p.craft * 0.8), HZ);
      foregroundWisps();

    } else if (L === 'Vast Restraint') {
      // Restraint frame: terminal far & TINY, huge empty cloud sea & sky.
      sun(1.1);
      farHaze();
      contrails(Math.round(p.contrails * 0.5));
      // tiny terminal on a small distant plateau near the horizon
      const plX = W * (0.30 + r() * 0.40);
      const plW = W * 0.16;
      const plTop = HZ + H * 0.01, plBot = HZ + H * 0.10;
      plateau(plX, plW, plTop, plBot, warm);
      const tw = plW * 0.62, gh = H * 0.035;
      terminal(plX, plTop - H * 0.004, tw, gh, false);
      if (r() < 0.5) controlTower(plX + (r() - 0.5) * tw * 0.5, plTop - H * 0.006, H * (0.05 + r() * 0.03));
      // a couple of distant moth craft near it
      x.save();
      for (let i = 0; i < 3; i++) {
        x.save(); x.translate(plX + (r() - 0.5) * W * 0.3, HZ - H * (0.04 + r() * 0.10));
        dart(3 + r() * 4, r() < 0.5 ? 1 : -1, 0.2); x.restore();
      }
      x.restore();
      godrays(0.5);
      // sweeping low cloud layers fill the vast lower half — the empty sea
      cloudBand(HZ + H * 0.06, H * 0.20, K.mix(P.sky2, P.cream, 0.5), 0.34, 240, seed * 9);
      cloudBand(H * 0.62, H * 0.26, K.mix(P.lav, P.cream, 0.45), 0.30, 200, seed * 17 + 40);
      foregroundWisps();

    } else if (L === 'Gate Reach') {
      // Hero close-up: ONE big gate edge + a jet-bridge reaching across into void.
      sun(1);
      farHaze();
      godrays(0.7);
      contrails(Math.round(p.contrails * 0.6));
      // a large foreground plateau lip on one side
      const side = r() < 0.5 ? 0 : 1; // gate anchored left or right
      const anchorX = side === 0 ? W * (0.04 + r() * 0.06) : W * (0.90 + r() * 0.04);
      const dir = side === 0 ? 1 : -1;
      const deckY = HZ + H * (0.06 + r() * 0.10);
      // big plateau mass under the gate
      plateau(anchorX + dir * W * 0.04, W * 0.5, deckY - H * 0.04, H * 0.98, warm);
      // big partial terminal — only its near end is in frame (huge)
      const tw = W * (0.46 + r() * 0.16), gh = H * (0.30 + r() * 0.12);
      const T = terminal(anchorX + dir * tw * 0.42, deckY, tw, gh, true);
      // the hero jet-bridge reaching far into the open void
      const reach = W * (0.34 + r() * 0.22);
      jetBridge(side === 0 ? T.termR : T.termL, deckY - H * 0.02, dir, reach, H * (0.02 + r() * 0.03),
        Math.max(4, H * 0.012));
      // a second shorter bridge below
      if (r() < 0.7) jetBridge(side === 0 ? T.termR : T.termL, deckY + H * 0.02, dir, reach * 0.6, H * 0.015, Math.max(3, H * 0.009));
      controlTower(anchorX + dir * tw * 0.2, T.termY + H * 0.005, H * (0.20 + r() * 0.12));
      flock(Math.round(p.craft * 0.6), HZ);
      foregroundWisps();

    } else if (L === "Runway's End") {
      // The runway as the hero DIAGONAL slicing the frame, ending in open sky.
      sun(1);
      farHaze();
      godrays(0.6);
      contrails(Math.round(p.contrails * 0.7));
      // runway base WIDE in a foreground corner, vanishing toward the horizon.
      const fromLeft = r() < 0.5;
      const baseX = fromLeft ? W * (0.02 + r() * 0.08) : W * (0.86 + r() * 0.08);
      const baseY = H * (0.90 + r() * 0.06);
      // vanishing point lifts ABOVE the horizon — runway ends in open sky
      const vx = W * (0.46 + r() * 0.16);
      const vy = HZ - H * (0.10 + r() * 0.08);
      // plateau hugging the runway base
      plateau((baseX + vx) / 2, W * 0.6, baseY - H * 0.12, H * 1.0, warm);
      // hero runway — big near edge, dramatic taper into sky
      runway(baseX, baseY, vx, vy, W * (0.26 + r() * 0.08));
      // a small terminal set back beside the runway end, secondary
      const plX = fromLeft ? W * (0.70 + r() * 0.14) : W * (0.16 + r() * 0.14);
      const plTop = HZ + H * 0.015;
      plateau(plX, W * 0.20, plTop - H * 0.02, plTop + H * 0.12, warm);
      terminal(plX, plTop, W * 0.15, H * 0.06, false);
      if (r() < 0.6) controlTower(plX + (r() - 0.5) * W * 0.08, plTop - H * 0.004, H * (0.07 + r() * 0.05));
      // a craft on final approach over the runway end
      x.save(); x.translate(vx + (r() - 0.5) * W * 0.06, vy - H * (0.05 + r() * 0.06));
      dart(12 + r() * 8, fromLeft ? 1 : -1, 0.7); x.restore();
      flock(Math.round(p.craft * 0.4), HZ);
      foregroundWisps();

    } else if (L === 'The Flock') {
      // The craft ARE the subject: a big swarm across a low-horizon sky.
      sun(1);
      // terminal is a distant sliver on the horizon
      const plX = W * (0.30 + r() * 0.40);
      plateau(plX, W * 0.14, HZ - H * 0.01, HZ + H * 0.06, warm);
      terminal(plX, HZ - H * 0.012, W * 0.10, H * 0.022, false);
      farHaze();
      godrays(0.6);
      // big layered flock filling the sky, clustered formations
      const clusters = K.rint(r, 2, 4);
      for (let c = 0; c < clusters; c++) {
        const ccx = W * (0.15 + r() * 0.70), ccy = HZ * (0.15 + r() * 0.6);
        const cd = 0.35 + r() * 0.55; // cluster depth
        const cn = K.rint(r, 5, 11);
        const cdir = r() < 0.5 ? 1 : -1;
        for (let i = 0; i < cn; i++) {
          const sz = (6 + cd * 22) * (0.6 + r() * 0.7);
          x.save();
          x.translate(ccx + (r() - 0.5) * W * 0.22, ccy + (r() - 0.5) * H * 0.18);
          x.rotate((r() - 0.5) * 0.3 + (cdir < 0 ? Math.PI : 0) * 0);
          dart(sz, cdir, cd);
          if (cd > 0.4) {
            x.globalCompositeOperation = 'screen';
            x.strokeStyle = K.rgba(P.cream, 0.12 * cd);
            x.lineWidth = sz * 0.10;
            x.beginPath(); x.moveTo(-sz * 0.5 * cdir, 0); x.lineTo(-sz * (3 + r() * 3) * cdir, sz * 0.12); x.stroke();
          }
          x.restore();
        }
      }
      // scattered far specks too
      flock(p.craft, HZ);
      contrails(p.contrails);
      foregroundWisps();

    } else { // God-Rays
      // Light shafts DOMINATE; architecture is a silhouette against the blaze.
      sun(1.3);
      farHaze();
      godrays(1.8); // dominant beams
      // extra wide volumetric shafts
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const ang = (-Math.PI / 2) + (r() - 0.5) * 0.7;
        const len = H * 1.4;
        const wBeam = W * (0.08 + r() * 0.10);
        const ex = sunX + Math.cos(ang) * len, ey = sunY - Math.sin(ang) * len;
        const px = Math.cos(ang + Math.PI / 2), py = -Math.sin(ang + Math.PI / 2);
        const grd = x.createLinearGradient(sunX, sunY, ex, ey);
        grd.addColorStop(0, K.rgba(P.cream, 0.22));
        grd.addColorStop(0.5, K.rgba(P.gold, 0.10));
        grd.addColorStop(1, K.rgba(P.gold, 0));
        x.fillStyle = grd;
        x.beginPath(); x.moveTo(sunX, sunY);
        x.lineTo(ex + px * wBeam, ey + py * wBeam);
        x.lineTo(ex - px * wBeam, ey - py * wBeam);
        x.closePath(); x.fill();
      }
      x.restore();
      // silhouetted terminal — dark against the glare
      const plX = W * (0.30 + r() * 0.40);
      const plW = W * (0.40 + r() * 0.20);
      const plTop = HZ + H * 0.02;
      // dark plateau silhouette
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(K.mix(P.lav, '#2a2440', 0.6), 0.5);
      x.beginPath();
      x.moveTo(plX - plW / 2, H);
      for (let xx = plX - plW / 2; xx <= plX + plW / 2; xx += 6) {
        const u = (xx - (plX - plW / 2)) / plW;
        const edge = Math.sin(u * Math.PI);
        x.lineTo(xx, plTop - edge * H * 0.06 + noise.fbm(xx / 90, seed * 3, 4) * H * 0.03);
      }
      x.lineTo(plX + plW / 2, H);
      x.closePath(); x.fill();
      x.restore();
      // terminal as dark silhouette with just rim light + a few lit gates
      const deckY = plTop - H * 0.005;
      const tw = plW * 0.7, gh = H * 0.12;
      const termL = plX - tw / 2, termY = deckY - gh;
      x.save();
      x.fillStyle = K.rgba(K.mix(P.lav, '#241f38', 0.5), 0.7);
      x.fillRect(termL, termY, tw, gh);
      // rim light on sun side
      x.globalCompositeOperation = 'lighter';
      const rimX = sunX < plX ? termL : termL + tw;
      const rg = x.createLinearGradient(rimX, 0, sunX < plX ? termL + tw * 0.4 : termL + tw * 0.6, 0);
      rg.addColorStop(0, K.rgba(P.cream, 0.5));
      rg.addColorStop(1, K.rgba(P.cream, 0));
      x.fillStyle = rg; x.fillRect(termL, termY, tw, gh);
      // a few warm lit gates punching through
      const gateW = tw / p.gates;
      for (let i = 0; i < p.gates; i++) {
        if (r() < 0.5) continue;
        const gx = termL + (i + 0.5) * gateW;
        x.fillStyle = K.rgba(K.mix(P.gold, P.cream, 0.4), 0.4 + r() * 0.3);
        x.fillRect(gx - gateW * 0.3, termY + gh * (0.4 + r() * 0.4), gateW * 0.6, gh * 0.16);
      }
      x.restore();
      controlTower(plX + (r() - 0.5) * tw * 0.5, termY + H * 0.005, H * (0.16 + r() * 0.10));
      // silhouette craft crossing the beams
      x.save();
      for (let i = 0; i < 6; i++) {
        x.save(); x.translate(r() * W, HZ * (0.2 + r() * 0.6)); x.rotate((r() - 0.5) * 0.4);
        x.fillStyle = K.rgba('#2a2440', 0.5 + r() * 0.3);
        const sz = 8 + r() * 16;
        x.fillRect(-sz * 0.5, -sz * 0.05, sz, sz * 0.1);
        x.beginPath(); x.moveTo(0, 0); x.lineTo(-sz * 0.35, -sz * 0.4); x.lineTo(-sz * 0.15, 0); x.lineTo(-sz * 0.35, sz * 0.4); x.closePath(); x.fill();
        x.restore();
      }
      x.restore();
      contrails(Math.round(p.contrails * 0.5));
      foregroundWisps();
    }

    finish();
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'concourse', draw, traits };
})();
