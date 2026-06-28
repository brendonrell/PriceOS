/* ORRERY — the interior of a vast impossible machine / cosmic clockwork.
 * Looking into an enormous dark chamber: nested rotating rings, armillary
 * spheres, great gears, orbital tracks, hanging plumb-weights, light-conduits
 * and a glowing ember core, all receding into hazy depth. Concentric/elliptical
 * orbital geometry anchors the frame; tiny catwalks / figures / lamps sell the
 * immensity. Surreal = the mechanism is beautiful but doesn't quite make sense.
 *
 * COLOR: BRASS & EMBER — aged brass/bronze/antique-gold metal, deep teal-black
 * chamber, glowing ORANGE-amber ember core, with a cool verdigris-teal
 * counterpoint. From afar: "golden brass clockwork glowing in the dark."
 * NOT cyberpunk, NOT outrun, NOT a clean chrome study — a SCENE with depth.
 */
window.ENGINE = (function () {
  const K = window.KIT;
  const TAU = Math.PI * 2;

  // chamber = deep teal-black walls; brass/bronze/gold = metal family;
  // ember = glowing orange-amber core; verdigris = cool teal counterpoint;
  // glow = atmospheric scatter wash near the core.
  const PALS = [
    { name: 'Ember Brass',     chamber: '#0a1416', brass: '#c98a2e', bronze: '#8a5a20', gold: '#f0c259', ember: '#ff7a1e', verd: '#2c8a78', glow: '#ffae46' },
    { name: 'Verdigris Forge', chamber: '#08161a', brass: '#b9842f', bronze: '#7c5320', gold: '#e6bd5a', ember: '#ff6a14', verd: '#36a892', glow: '#ff9a3c' },
    { name: 'Antique Gold',    chamber: '#0c1212', brass: '#d49a3a', bronze: '#946028', gold: '#ffd271', ember: '#ff8326', verd: '#318274', glow: '#ffbf5a' },
    { name: 'Deep Bronze',     chamber: '#0a1013', brass: '#b07a2a', bronze: '#6f4a1c', gold: '#e0b256', ember: '#ff6e16', verd: '#2a7b6c', glow: '#ff9e40' },
    { name: 'Molten Core',     chamber: '#0d1112', brass: '#c98c34', bronze: '#86571f', gold: '#f4c25e', ember: '#ff5e0e', verd: '#2f8d7a', glow: '#ff8a2c' },
    { name: 'Teal Patina',     chamber: '#07171b', brass: '#a87d34', bronze: '#6c4d22', gold: '#dcb95f', ember: '#ff7820', verd: '#3fb39a', glow: '#ffaa48' },
    { name: 'Sunken Brass',    chamber: '#0b1517', brass: '#bd8730', bronze: '#7a531f', gold: '#ecc063', ember: '#ff7115', verd: '#2d8b79', glow: '#ffa341' },
    { name: 'Amber Vault',     chamber: '#10110f', brass: '#d09238', bronze: '#8c5c22', gold: '#ffce6c', ember: '#ff8a28', verd: '#347f6f', glow: '#ffc057' },
  ];

  const FMTS = [
    { W: 1480, H: 1040, t: 'Chamber' },
    { W: 1320, H: 1320, t: 'Aperture' },
    { W: 1040, H: 1440, t: 'Shaft' },
  ];
  const CORES = ['Ember Sun', 'Caged Star', 'Plumb Eye', 'Hollow Core'];
  const SPINS = ['Slow Drift', 'Geared', 'Wobble', 'Locked'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const core = K.pick(CORES, r);
    const spin = K.pick(SPINS, r);
    const rings = K.rint(r, 4, 7);
    const gears = K.rint(r, 3, 6);
    const armillary = r() < 0.7;
    const event = r() < 0.08 ? K.pick(['Eclipse Gear', 'Twin Cores', 'Snapped Track', 'Gilded Storm'], r) : null;
    return { pal, fmt, core, spin, rings, gears, armillary, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Core: p.core,
      Spin: p.spin,
      Rings: p.rings >= 6 ? 'Many' : 'Few',
      Armillary: p.armillary ? 'Yes' : 'No',
    };
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── deep chamber backdrop: dark teal-black vault with a faint warm depth
       well behind the core, never a flat field ── */
  function chamberBack(x, P, W, H, cx, cy, noise, r) {
    // base radial: warmer toward core, sinking to teal-black at the edges
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.85);
    g.addColorStop(0, K.mix(P.chamber, P.bronze, 0.34));
    g.addColorStop(0.30, K.mix(P.chamber, P.bronze, 0.12));
    g.addColorStop(0.62, P.chamber);
    g.addColorStop(1, K.mix(P.chamber, '#000', 0.55));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // huge curved vault ribs receding into depth (architecture for immensity)
    x.save(); x.globalCompositeOperation = 'screen';
    const ribs = 9;
    for (let i = 0; i < ribs; i++) {
      const t = i / ribs;
      const rr = Math.max(W, H) * (0.30 + t * 0.7);
      x.strokeStyle = K.rgba(K.mix(P.bronze, P.chamber, 0.4 + t * 0.4), 0.10 * (1 - t * 0.5));
      x.lineWidth = (3 + (1 - t) * 9);
      x.beginPath(); x.ellipse(cx, cy, rr, rr * 0.92, 0, 0, TAU); x.stroke();
    }
    x.restore();

    // teal patina drift on the walls (verdigris counterpoint, low & cool)
    K.hazeSheet(x, W, H, noise, K.mix(P.verd, P.chamber, 0.5), 0.07, 520 + r() * 200, 'screen');
    // warm depth haze hugging the core
    K.hazeSheet(x, W, H, noise, P.glow, 0.05, 360 + r() * 160, 'screen');
  }

  /* ── one elliptical orbital track/ring, brass with a lit limb & dust ── */
  function orbitRing(x, P, cx, cy, rad, tilt, squash, thick, col, r, noise, depth) {
    x.save();
    x.translate(cx, cy);
    x.rotate(tilt);
    // outer soft scatter so rings glow in the haze
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(K.mix(col, P.glow, 0.3), 0.05 * depth);
    x.lineWidth = thick * 3.2;
    x.beginPath(); x.ellipse(0, 0, rad, rad * squash, 0, 0, TAU); x.stroke();
    x.restore();

    // the metal band itself, drawn as a thick stroke with a chrome-ish ramp
    const segs = 120;
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * TAU;
      const a1 = ((s + 1) / segs) * TAU;
      const px = Math.cos(a0) * rad, py = Math.sin(a0) * rad * squash;
      const qx = Math.cos(a1) * rad, qy = Math.sin(a1) * rad * squash;
      // top-lit: brightest where the band faces up-left
      const facing = (Math.cos(a0 - 2.3) + 1) / 2; // lit lobe
      const n = (noise.fbm(Math.cos(a0) * 2 + rad * 0.01, Math.sin(a0) * 2, 3) + 1) / 2;
      const lit = K.clamp(facing * 0.9 + n * 0.25, 0, 1);
      const c = lit > 0.6 ? K.mix(col, '#fff5dd', (lit - 0.6) * 1.6)
              : K.mix(col, P.chamber, (0.6 - lit) * 0.9);
      x.strokeStyle = K.rgba(c, (0.5 + lit * 0.5) * depth);
      x.lineWidth = thick * (0.7 + facing * 0.6);
      x.beginPath(); x.moveTo(px, py); x.lineTo(qx, qy); x.stroke();
    }
    // thin verdigris inner edge line for material depth
    x.strokeStyle = K.rgba(K.mix(P.verd, col, 0.4), 0.3 * depth);
    x.lineWidth = Math.max(1, thick * 0.18);
    x.beginPath(); x.ellipse(0, 0, rad - thick * 0.5, (rad - thick * 0.5) * squash, 0, 0, TAU); x.stroke();

    // tick marks / graduations around the track (orrery scale markers)
    const ticks = Math.floor(rad / 7);
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * TAU;
      const major = i % 6 === 0;
      const tx = Math.cos(a) * rad, ty = Math.sin(a) * rad * squash;
      const tox = Math.cos(a) * (rad + (major ? thick * 1.3 : thick * 0.6));
      const toy = Math.sin(a) * (rad + (major ? thick * 1.3 : thick * 0.6)) * squash;
      x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.35), (major ? 0.4 : 0.2) * depth);
      x.lineWidth = major ? 1.6 : 0.8;
      x.beginPath(); x.moveTo(tx, ty); x.lineTo(tox, toy); x.stroke();
    }
    x.restore();
  }

  /* ── a great gear: toothed disc seen flat-ish, brass, hub + spokes ── */
  function gear(x, P, cx, cy, rad, teeth, col, r, depth, noise) {
    x.save();
    x.translate(cx, cy);
    x.rotate(r() * TAU);
    const squash = 0.78 + r() * 0.18;
    x.scale(1, squash);

    // soft shadow seat
    K.softShadow(x, 0, rad * 0.12, rad * 1.5, 0.28 * depth);

    // teeth ring
    const inner = rad * 0.84, toothH = rad * 0.14;
    x.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU;
      const an = ((i + 0.5) / teeth) * TAU;
      const a2 = ((i + 1) / teeth) * TAU;
      x.lineTo(Math.cos(a) * (rad + toothH), Math.sin(a) * (rad + toothH));
      x.lineTo(Math.cos(an) * rad, Math.sin(an) * rad);
      x.lineTo(Math.cos(a2) * (rad + toothH), Math.sin(a2) * (rad + toothH));
    }
    x.closePath();
    // metal ramp fill (top-lit)
    const gg = x.createLinearGradient(-rad, -rad, rad, rad);
    gg.addColorStop(0, K.mix(col, '#fff1cf', 0.48));
    gg.addColorStop(0.4, col);
    gg.addColorStop(0.7, K.mix(col, '#2a1605', 0.45));
    gg.addColorStop(1, K.mix(col, '#000', 0.4));
    x.globalAlpha = depth;
    x.fillStyle = gg; x.fill();
    x.globalAlpha = 1;

    // warm shadow tone for recessed metal (keeps spokes/hub brass, not cold)
    const shade = K.mix(col, '#2a1605', 0.5);
    // disc body
    x.beginPath(); x.arc(0, 0, inner, 0, TAU);
    x.fillStyle = K.rgba(K.mix(col, shade, 0.7), depth); x.fill();
    // inner rim highlight
    x.strokeStyle = K.rgba(K.mix(col, '#fff1cf', 0.4), 0.4 * depth); x.lineWidth = 2;
    x.beginPath(); x.arc(0, 0, inner * 0.96, 0, TAU); x.stroke();

    // spokes
    const spokes = K.rint(r, 4, 7);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TAU + 0.2;
      x.save(); x.rotate(a);
      const gw = inner * 0.12;
      const hi = K.mix(col, '#fff1cf', 0.42); // warm gold highlight, never bluish-white
      const sg = x.createLinearGradient(-gw, 0, gw, 0);
      sg.addColorStop(0, K.rgba(shade, depth));
      sg.addColorStop(0.5, K.rgba(hi, depth));
      sg.addColorStop(1, K.rgba(shade, depth));
      x.fillStyle = sg;
      x.fillRect(-gw, rad * 0.18, gw * 2, inner * 0.66);
      x.restore();
    }
    // hub
    x.beginPath(); x.arc(0, 0, inner * 0.26, 0, TAU);
    const hg = x.createRadialGradient(-inner * 0.08, -inner * 0.08, 1, 0, 0, inner * 0.26);
    hg.addColorStop(0, K.mix(col, '#fff1cf', 0.55));
    hg.addColorStop(1, shade);
    x.fillStyle = hg; x.globalAlpha = depth; x.fill(); x.globalAlpha = 1;
    x.strokeStyle = K.rgba(K.mix(P.verd, col, 0.4), 0.4 * depth); x.lineWidth = 1.4; x.stroke();

    x.restore();
  }

  /* ── armillary sphere: nested rings around a small glowing node ── */
  function armillary(x, P, cx, cy, rad, col, r, depth) {
    x.save();
    x.translate(cx, cy);
    const base = r() * TAU;
    const n = K.rint(r, 3, 5);
    for (let i = 0; i < n; i++) {
      const tilt = base + i * (TAU / n) * 0.5 + r() * 0.4;
      const sq = 0.12 + r() * 0.5;
      x.save(); x.rotate(tilt);
      // back half (dim)
      x.strokeStyle = K.rgba(K.mix(col, P.chamber, 0.5), 0.3 * depth);
      x.lineWidth = 1.5 + rad * 0.012;
      x.beginPath(); x.ellipse(0, 0, rad, rad * sq, 0, Math.PI, TAU); x.stroke();
      // front half (lit)
      x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.35), 0.7 * depth);
      x.lineWidth = 1.8 + rad * 0.016;
      x.beginPath(); x.ellipse(0, 0, rad, rad * sq, 0, 0, Math.PI); x.stroke();
      x.restore();
    }
    // glowing node at center
    K.bloom(x, 0, 0, rad * 0.7, P.ember, 0.5 * depth);
    const cg = x.createRadialGradient(0, 0, 0, 0, 0, rad * 0.22);
    cg.addColorStop(0, K.mix('#fff', P.glow, 0.25));
    cg.addColorStop(0.4, K.mix(P.glow, '#fff', 0.35));
    cg.addColorStop(1, K.rgba(P.ember, 0));
    x.fillStyle = cg; x.beginPath(); x.arc(0, 0, rad * 0.22, 0, TAU); x.fill();
    x.restore();
  }

  /* ── hanging plumb-weight on a thin chain from the top of frame ── */
  function plumb(x, P, px, topY, len, col, r, depth) {
    x.save();
    // chain
    x.strokeStyle = K.rgba(K.mix(col, P.chamber, 0.3), 0.5 * depth);
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(px, topY);
    const sway = (r() - 0.5) * 10;
    x.quadraticCurveTo(px + sway, topY + len * 0.5, px + sway * 1.4, topY + len);
    x.stroke();
    // weight (teardrop / plumb bob)
    const wx = px + sway * 1.4, wy = topY + len;
    const ws = 8 + r() * 14;
    K.softShadow(x, wx, wy + ws, ws * 2, 0.3 * depth);
    x.beginPath();
    x.moveTo(wx, wy - ws * 0.4);
    x.quadraticCurveTo(wx + ws, wy, wx, wy + ws * 1.6);
    x.quadraticCurveTo(wx - ws, wy, wx, wy - ws * 0.4);
    x.closePath();
    const wg = x.createLinearGradient(wx - ws, wy, wx + ws, wy + ws);
    wg.addColorStop(0, K.mix(col, '#fff', 0.5));
    wg.addColorStop(0.5, col);
    wg.addColorStop(1, K.mix(col, P.chamber, 0.5));
    x.fillStyle = wg; x.globalAlpha = depth; x.fill(); x.globalAlpha = 1;
    x.strokeStyle = K.rgba(K.mix(P.verd, col, 0.4), 0.3 * depth); x.lineWidth = 1; x.stroke();
    x.restore();
  }

  /* ── the glowing ember core at the heart of the machine ── */
  function core(x, P, cx, cy, rad, kind, r, noise) {
    // massive atmospheric scatter
    K.bloom(x, cx, cy, rad * 5.5, P.glow, 0.30);
    K.bloom(x, cx, cy, rad * 3.0, P.ember, 0.34);
    K.bloom(x, cx, cy, rad * 1.6, K.mix(P.glow, '#fff', 0.4), 0.45);

    if (kind === 'Hollow Core') {
      // a blazing aperture: a fiery annulus around a warm-glowing (not black)
      // centre — reads as a contained ring of fire, never a void.
      // warm-filled centre first so it never crushes to black
      const cg = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.62);
      cg.addColorStop(0, K.mix(P.ember, P.chamber, 0.35));
      cg.addColorStop(0.6, K.mix(P.ember, P.chamber, 0.15));
      cg.addColorStop(1, K.rgba(P.glow, 0));
      x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, rad * 0.62, 0, TAU); x.fill();
      // the hot annulus
      x.save(); x.globalCompositeOperation = 'lighter';
      const ag = x.createRadialGradient(cx, cy, rad * 0.55, cx, cy, rad * 1.05);
      ag.addColorStop(0, K.rgba(P.ember, 0));
      ag.addColorStop(0.45, K.rgba(P.ember, 0.7));
      ag.addColorStop(0.62, K.rgba(K.mix(P.glow, '#fff', 0.5), 0.85));
      ag.addColorStop(0.8, K.rgba(P.glow, 0.5));
      ag.addColorStop(1, K.rgba(P.glow, 0));
      x.fillStyle = ag; x.beginPath(); x.arc(cx, cy, rad * 1.05, 0, TAU); x.fill();
      // bright inner lip
      x.strokeStyle = K.rgba(K.mix(P.glow, '#fff', 0.6), 0.7); x.lineWidth = rad * 0.05;
      x.beginPath(); x.arc(cx, cy, rad * 0.62, 0, TAU); x.stroke();
      x.restore();
      return;
    }

    // solid molten core — kept WARM all the way to the hot center (no cool
    // white dot: the centre is incandescent amber-white, not blue-white)
    const g = x.createRadialGradient(cx - rad * 0.12, cy - rad * 0.12, rad * 0.04, cx, cy, rad);
    g.addColorStop(0, K.mix('#fff6e6', P.glow, 0.18));
    g.addColorStop(0.22, K.mix(P.glow, '#fff', 0.35));
    g.addColorStop(0.5, P.glow);
    g.addColorStop(0.78, P.ember);
    g.addColorStop(1, K.mix(P.ember, P.chamber, 0.55));
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    // molten mottling / convection cells
    x.globalCompositeOperation = 'overlay';
    const step = Math.max(2, Math.floor(rad / 40));
    for (let yy = cy - rad; yy < cy + rad; yy += step) {
      for (let xx = cx - rad; xx < cx + rad; xx += step) {
        const n = noise.fbm(xx / (rad * 0.4), yy / (rad * 0.4), 5, 0.6, 2.2);
        if (n > 0.05) { x.fillStyle = K.rgba(K.mix('#fff', P.glow, 0.3), Math.min(0.4, n * 0.4)); x.fillRect(xx, yy, step + 1, step + 1); }
        else if (n < -0.05) { x.fillStyle = K.rgba(K.mix(P.ember, '#000', 0.5), Math.min(0.4, -n * 0.4)); x.fillRect(xx, yy, step + 1, step + 1); }
      }
    }
    x.restore();

    if (kind === 'Caged Star') {
      // dark armature bars caging the star (the surreal "contained sun")
      x.save();
      x.strokeStyle = K.rgba(K.mix(P.bronze, '#000', 0.3), 0.7);
      x.lineWidth = rad * 0.06;
      const bars = 5;
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Math.PI;
        x.save(); x.translate(cx, cy); x.rotate(a);
        x.beginPath(); x.ellipse(0, 0, rad * 1.02, rad * (0.3 + i * 0.1), 0, 0, TAU); x.stroke();
        x.restore();
      }
      x.restore();
    }
    // hot limb (warm, not white)
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(K.mix(P.glow, '#fff', 0.5), 0.5); x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, rad * 0.99, 0, TAU); x.stroke();
    x.restore();
  }

  /* ── volumetric light shafts radiating from the core (dust in light) ── */
  function lightShafts(x, P, cx, cy, W, H, r, noise) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = K.rint(r, 5, 9);
    const maxR = Math.max(W, H);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU;
      const wedge = 0.05 + r() * 0.10;
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a - wedge) * maxR, cy + Math.sin(a - wedge) * maxR);
      x.lineTo(cx + Math.cos(a + wedge) * maxR, cy + Math.sin(a + wedge) * maxR);
      x.closePath();
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      g.addColorStop(0, K.rgba(P.glow, 0.10 + r() * 0.06));
      g.addColorStop(0.4, K.rgba(P.glow, 0.03));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fill();
    }
    x.restore();
  }

  /* ── tiny scale markers: catwalks, lamps, a lone figure — sell immensity ── */
  function scaleMarkers(x, P, W, H, cx, cy, r) {
    x.save();
    // a thin catwalk crossing the lower chamber
    if (r() < 0.85) {
      const cwY = H * (0.7 + r() * 0.18);
      const x0 = W * (0.1 + r() * 0.2), x1 = W * (0.6 + r() * 0.3);
      x.strokeStyle = K.rgba(K.mix(P.bronze, '#000', 0.2), 0.7);
      x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(x0, cwY); x.lineTo(x1, cwY + (r() - 0.5) * 40); x.stroke();
      // rail posts
      const posts = K.rint(r, 6, 12);
      const slope = (r() - 0.5) * 40;
      for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const px = x0 + (x1 - x0) * t, py = cwY + slope * t;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - 6); x.stroke();
      }
      // a lone tiny figure on the catwalk, lit from the core
      const fx = x0 + (x1 - x0) * (0.3 + r() * 0.4), fy = cwY + ((r() - 0.5) * 40) * 0.4;
      x.fillStyle = K.rgba('#000', 0.85);
      x.fillRect(fx - 1.4, fy - 9, 2.8, 9);
      x.beginPath(); x.arc(fx, fy - 10.5, 1.8, 0, TAU); x.fill();
      // rim light on figure from core side
      x.fillStyle = K.rgba(P.glow, 0.6);
      x.fillRect(fx + (cx > fx ? 1 : -2.4), fy - 9, 0.9, 9);
    }
    // scattered tiny lamps clinging to the structure
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < K.rint(r, 8, 18); i++) {
      const lx = r() * W, ly = H * (0.2 + r() * 0.7);
      K.bloom(x, lx, ly, 10 + r() * 14, r() < 0.3 ? P.verd : P.glow, 0.35);
      x.fillStyle = K.rgba(r() < 0.3 ? P.verd : P.glow, 0.8);
      x.beginPath(); x.arc(lx, ly, 1 + r() * 1.2, 0, TAU); x.fill();
    }
    x.restore();
  }

  /* ── floating dust / motes in the chamber air ── */
  function dust(x, P, W, H, cx, cy, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 220; i++) {
      const mx = r() * W, my = r() * H;
      const d = Math.hypot(mx - cx, my - cy) / Math.max(W, H);
      const s = r() * 1.6 + 0.2;
      const a = (0.05 + r() * 0.3) * (1 - d * 0.6);
      x.fillStyle = K.rgba(r() < 0.25 ? P.verd : P.glow, a);
      x.beginPath(); x.arc(mx, my, s, 0, TAU); x.fill();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // core sits slightly off-center for that "real but off" composition
    const cx = W * (0.42 + r() * 0.18);
    const cy = H * (0.40 + r() * 0.16);
    const baseR = Math.min(W, H);

    chamberBack(x, P, W, H, cx, cy, noise, r);

    // light shafts behind the rings (dust in light)
    lightShafts(x, P, cx, cy, W, H, r, noise);

    // ── back gears (deep, dim, large), sunk into atmosphere ──
    for (let i = 0; i < Math.ceil(p.gears / 2); i++) {
      const gx = r() * W, gy = r() * H;
      const grad = baseR * (0.12 + r() * 0.14);
      const col = r() < 0.5 ? P.bronze : K.mix(P.brass, P.bronze, 0.5);
      gear(x, P, gx, gy, grad, K.rint(r, 14, 26), col, r, 0.4 + r() * 0.2, noise);
    }
    // depth haze over back gears to sink them
    K.hazeSheet(x, W, H, noise, K.mix(P.chamber, P.verd, 0.3), 0.08, 300, 'screen');

    // ── nested elliptical orbital rings around the core (the anchor) ──
    const ringTilt = r() * TAU;
    const ringSquashBase = 0.22 + r() * 0.30;
    for (let i = 0; i < p.rings; i++) {
      const t = i / p.rings;
      const rad = baseR * (0.16 + t * 0.46);
      const tilt = ringTilt + (i % 2 ? 0.5 : -0.4) * (0.4 + r() * 0.5) + (r() - 0.5) * 0.3;
      const squash = K.clamp(ringSquashBase + (r() - 0.5) * 0.25, 0.12, 0.7);
      const thick = baseR * (0.012 + r() * 0.014) * (1 + t * 0.4);
      const col = i % 3 === 0 ? P.gold : (i % 3 === 1 ? P.brass : P.bronze);
      const depth = 0.55 + t * 0.45;
      orbitRing(x, P, cx, cy, rad, tilt, squash, thick, col, r, noise, depth);

      // a small orbiting body riding the track (planet / node)
      if (r() < 0.7) {
        const oa = r() * TAU;
        const ox = cx + Math.cos(oa + tilt) * rad * Math.cos(tilt) - Math.sin(oa) * rad * squash * Math.sin(tilt);
        const oy = cy + Math.cos(oa + tilt) * rad * Math.sin(tilt) + Math.sin(oa) * rad * squash * Math.cos(tilt);
        const obr = baseR * (0.012 + r() * 0.022);
        const cool = r() < 0.32;
        K.bloom(x, ox, oy, obr * 4, cool ? K.mix(P.verd, P.glow, 0.25) : P.glow, 0.3);
        const og = x.createRadialGradient(ox - obr * 0.3, oy - obr * 0.3, obr * 0.1, ox, oy, obr);
        const oc = cool ? K.mix(P.verd, P.bronze, 0.3) : K.mix(P.gold, P.glow, 0.4);
        og.addColorStop(0, K.mix(oc, '#fff', 0.6));
        og.addColorStop(0.7, oc);
        og.addColorStop(1, K.mix(oc, P.chamber, 0.6));
        x.fillStyle = og; x.beginPath(); x.arc(ox, oy, obr, 0, TAU); x.fill();
      }
    }

    // ── the glowing ember core at the heart ──
    const coreR = baseR * (0.075 + r() * 0.035);
    if (p.event === 'Twin Cores') {
      core(x, P, cx - coreR * 1.6, cy, coreR * 0.8, p.core, r, noise);
      core(x, P, cx + coreR * 1.6, cy, coreR * 0.8, p.core, r, noise);
    } else {
      core(x, P, cx, cy, coreR, p.core, r, noise);
    }

    // ── armillary sphere(s) floating in the chamber ──
    if (p.armillary) {
      const ax = W * (0.18 + r() * 0.18) * (r() < 0.5 ? 1 : -1) + W * (cx > W / 2 ? 0.2 : 0.6);
      armillary(x, P, K.clamp(ax, W * 0.12, W * 0.88), H * (0.22 + r() * 0.4), baseR * (0.07 + r() * 0.05), P.brass, r, 0.85);
      if (r() < 0.4) armillary(x, P, W * (0.6 + r() * 0.3), H * (0.55 + r() * 0.3), baseR * (0.05 + r() * 0.03), P.gold, r, 0.7);
    }

    // ── front gears (large, sharp, partially off-frame for scale) ──
    for (let i = 0; i < Math.floor(p.gears / 2); i++) {
      const edge = r() < 0.5;
      const gx = edge ? (r() < 0.5 ? -baseR * 0.06 : W + baseR * 0.06) : r() * W;
      const gy = r() < 0.6 ? H * (0.7 + r() * 0.4) : r() * H;
      const grad = baseR * (0.18 + r() * 0.18);
      const col = r() < 0.5 ? P.brass : P.gold;
      gear(x, P, gx, gy, grad, K.rint(r, 18, 34), col, r, 0.9, noise);
    }

    // ── hanging plumb-weights from the top ──
    const nPlumb = K.rint(r, 2, 4);
    for (let i = 0; i < nPlumb; i++) {
      const px = W * (0.12 + r() * 0.76);
      plumb(x, P, px, -10, H * (0.18 + r() * 0.4), r() < 0.5 ? P.brass : P.bronze, r, 0.85);
    }

    // ── tiny scale markers + lamps ──
    scaleMarkers(x, P, W, H, cx, cy, r);

    // ── chamber dust in the air ──
    dust(x, P, W, H, cx, cy, r);

    // finishing atmosphere: warm haze pooled at core, cool patina at edges
    K.hazeSheet(x, W, H, noise, P.glow, 0.04, 420, 'screen');
    K.mottle(x, 0, 0, W, H, P.bronze, 2600, r, 'overlay');
    K.grain(x, W, H, 500, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.42); x.restore();
    // gentle top-down darkening for chamber depth
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(K.mix(P.chamber, '#000', 0.5), 0.45));
    tg.addColorStop(0.35, 'rgba(0,0,0,0)');
    tg.addColorStop(0.85, 'rgba(0,0,0,0)');
    tg.addColorStop(1, K.rgba(K.mix(P.chamber, '#000', 0.5), 0.4));
    x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_orrery', draw, traits };
})();
