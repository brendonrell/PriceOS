/* PROCESSION — an endless caravan across a vast twilight plain.
 * A long winding line of abstract robed figures, beasts of burden, tall poles
 * and standards, carried lanterns — snaking from the foreground back across an
 * immense indigo plain toward a too-bright golden destination on the horizon
 * (a gate / beacon / rift of light). Receding scale: near forms large & detailed
 * silhouettes, the line dwindling to specks at the horizon, lanterns dotting the
 * whole length with little gold glows. Heavy dust haze hangs over the line.
 * "Real but off": the procession is impossibly long and orderly, marching toward
 * a light that's too bright to look at.
 * Territory: DEEP INDIGO/ULTRAMARINE/BLUE-VIOLET twilight + saturated GOLD/amber
 * beacon & lanterns, with small ember/coral accents. Reads "deep blue twilight
 * marching toward a golden light." NOT cyberpunk, NOT synthwave, NOT pastel. */
window.ENGINE = (function () {
  const K = window.KIT;

  // sky1=zenith, sky2=mid sky, plain=ground base, beacon=destination gold,
  // lantern=carried light warmth, ember=tiny coral accent, ink=silhouettes/murk.
  const PALS = [
    { name: 'Indigo Vigil',    sky1: '#0a0a2e', sky2: '#1e1a55', plain: '#141033', beacon: '#ffcf52', lantern: '#ffb13a', ember: '#ff6a4d', ink: '#05040f' },
    { name: 'Ultramarine Pilgrim', sky1: '#070a38', sky2: '#1d2a78', plain: '#0e1340', beacon: '#ffd86a', lantern: '#ffbe48', ember: '#ff7a52', ink: '#04050e' },
    { name: 'Violet Exodus',   sky1: '#16082e', sky2: '#36205c', plain: '#1a0f33', beacon: '#ffc94e', lantern: '#ffae3e', ember: '#ff6a82', ink: '#070414' },
    { name: 'Cobalt Procession', sky1: '#040c2e', sky2: '#103a82', plain: '#08123a', beacon: '#ffe07a', lantern: '#ffc24e', ember: '#ff8a4a', ink: '#03060f' },
    { name: 'Midnight Caravan', sky1: '#0c0a26', sky2: '#241d52', plain: '#100c2c', beacon: '#ffb838', lantern: '#ff9e2e', ember: '#ff5e44', ink: '#050410' },
    { name: 'Lapis March',     sky1: '#06103a', sky2: '#1a3a8c', plain: '#0a1644', beacon: '#ffd25a', lantern: '#ffb840', ember: '#ff6f5a', ink: '#03070f' },
    { name: 'Amethyst Pilgrimage', sky1: '#1a0c38', sky2: '#3a2470', plain: '#1c1240', beacon: '#ffcf66', lantern: '#ffb24a', ember: '#ff7090', ink: '#080515' },
    { name: 'Deep Indigo Rift', sky1: '#08082a', sky2: '#181858', plain: '#0c0a30', beacon: '#ffe488', lantern: '#ffc858', ember: '#ff7e4e', ink: '#040310' },
  ];

  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  const DESTS = ['Gate', 'Beacon', 'Rift'];
  const HOURS = ['Dusk', 'Nightfall', 'Last Light', 'Blue Hour'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const dest = K.pick(DESTS, r);
    const hour = K.pick(HOURS, r);
    const moons = K.rint(r, 0, 2);
    const banners = r() < 0.7;
    const beasts = r() < 0.6;
    const event = r() < 0.08 ? K.pick(['Twin Beacons', 'Falling Star', 'Storm of Dust'], r) : null;
    return { pal, fmt, dest, hour, moons, banners, beasts, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = { Palette: p.pal.name, Format: p.fmt.t, Destination: p.dest, Hour: p.hour };
    if (p.moons) t.Moons = p.moons;
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── deep twilight sky: zenith indigo → mid → glow seated on the beacon ── */
  function sky(x, P, W, H, hY, beaconX) {
    const g = x.createLinearGradient(0, 0, 0, hY * 1.04);
    g.addColorStop(0, K.mix(P.sky1, '#000', 0.22));
    g.addColorStop(0.36, P.sky1);
    g.addColorStop(0.74, K.mix(P.sky1, P.sky2, 0.62));
    g.addColorStop(0.93, K.mix(P.sky2, P.beacon, 0.10));
    g.addColorStop(1, K.mix(P.sky2, P.beacon, 0.22));
    x.fillStyle = g; x.fillRect(0, 0, W, hY * 1.04);
    // broad cool plume of light rising off the horizon at the beacon
    x.save(); x.globalCompositeOperation = 'screen';
    const gl = x.createRadialGradient(beaconX, hY, 0, beaconX, hY, W * 0.62);
    gl.addColorStop(0, K.rgba(K.mix(P.beacon, P.sky2, 0.45), 0.34));
    gl.addColorStop(0.45, K.rgba(P.sky2, 0.12));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, hY * 1.1);
    x.restore();
  }

  /* ── a few faint stars high in the zenith ── */
  function stars(x, P, W, hY, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = K.rint(r, 60, 130);
    for (let i = 0; i < n; i++) {
      const sx = r() * W, sy = r() * hY * 0.6, s = r() * 1.3 + 0.2;
      x.fillStyle = K.rgba(r() < 0.25 ? P.lantern : '#cfd6ff', 0.1 + r() * 0.45);
      x.beginPath(); x.arc(sx, sy, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  /* ── strange moons hung in the twilight (real but off) ── */
  function moon(x, P, noise, cx, cy, rad, r) {
    K.bloom(x, cx, cy, rad * 2.4, K.mix(P.sky2, '#cfd6ff', 0.4), 0.16);
    const col = K.mix(P.sky2, '#dfe4ff', 0.55);
    const g = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad * 1.05);
    g.addColorStop(0, K.mix(col, '#fff', 0.4));
    g.addColorStop(0.6, col);
    g.addColorStop(1, K.mix(col, P.ink, 0.55));
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    // mottled craters
    x.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = r() * rad * 0.8;
      const mx = cx + Math.cos(a) * d, my = cy + Math.sin(a) * d, mr = rad * (0.05 + r() * 0.16);
      x.fillStyle = K.rgba(K.mix(col, P.ink, 0.5), 0.25);
      x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  /* ── the immense plain: indigo ground, deeper toward foreground, dust mottle,
       low ground swells & a faint worn path threading to the beacon ── */
  function plain(x, P, W, H, hY, r, noise, beaconX) {
    const g = x.createLinearGradient(0, hY - 6, 0, H);
    g.addColorStop(0, K.mix(P.plain, P.beacon, 0.12));
    g.addColorStop(0.16, K.mix(P.plain, P.sky2, 0.34));
    g.addColorStop(0.50, P.plain);
    g.addColorStop(1, K.mix(P.plain, P.ink, 0.60));
    x.fillStyle = g; x.fillRect(0, hY - 6, W, H - hY + 6);

    // low ground undulations — soft fbm bands receding into distance for depth
    x.save(); x.globalCompositeOperation = 'soft-light';
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const yc = hY + (H - hY) * Math.pow(t, 1.4);
      const amp = 6 + t * 40;
      const a = 0.06 + t * 0.10;
      x.fillStyle = K.rgba(i % 2 ? K.mix(P.plain, '#fff', 0.5) : K.mix(P.plain, P.ink, 0.6), a);
      x.beginPath(); x.moveTo(0, yc);
      for (let xx = 0; xx <= W; xx += 22) x.lineTo(xx, yc + noise.fbm(xx / (300 - t * 180), i * 4.2, 3) * amp);
      x.lineTo(W, yc + 40 + t * 60); x.lineTo(0, yc + 40 + t * 60); x.closePath(); x.fill();
    }
    x.restore();

    // dust texture across the ground
    K.mottle(x, 0, hY, W, H - hY, P.sky2, 2400, r, 'screen');

    // faint worn path — a pale light corridor narrowing toward the beacon
    x.save(); x.globalCompositeOperation = 'screen';
    for (let yy = hY + 2; yy < H; yy += 4) {
      const t = (yy - hY) / (H - hY);
      const cx = beaconX + (W * 0.5 - beaconX) * Math.pow(t, 1.3) * 0 + (beaconX) * 0; // path follows perspective toward beacon
      const px = beaconX + (W * 0.46 - beaconX) * Math.pow(t, 1.4);
      const w = (6 + t * t * 230);
      const a = 0.05 * (0.4 + t * 0.8);
      const gg = x.createLinearGradient(px - w, yy, px + w, yy);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(0.5, K.rgba(K.mix(P.beacon, P.plain, 0.4), a));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg; x.fillRect(px - w, yy, w * 2, 4);
    }
    x.restore();

    // warm light scatter pooling on the ground at the horizon under the beacon
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createRadialGradient(beaconX, hY + 4, 0, beaconX, hY + 4, W * 0.42);
    hb.addColorStop(0, K.rgba(K.mix(P.beacon, P.sky2, 0.4), 0.20));
    hb.addColorStop(0.5, K.rgba(P.sky2, 0.08));
    hb.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hb; x.fillRect(0, hY - H * 0.04, W, H * 0.45);
    x.restore();
  }

  /* ── the destination: a too-bright golden gate/beacon/rift on the horizon ── */
  function destination(x, P, W, H, hY, bx, by, kind, r, noise) {
    const R = W * 0.085;
    // huge atmospheric scatter — kept gold, only a small hot white center
    K.bloom(x, bx, by, R * 5.4, P.beacon, 0.32);
    K.bloom(x, bx, by, R * 2.8, K.mix(P.beacon, '#fff', 0.25), 0.34);
    K.bloom(x, bx, by, R * 1.3, K.mix(P.beacon, '#fff', 0.55), 0.40);
    K.bloom(x, bx, by, R * 0.55, '#ffffff', 0.5);

    x.save();
    if (kind === 'Beacon') {
      // a vertical shaft of light + hot core
      x.globalCompositeOperation = 'lighter';
      const shaft = x.createLinearGradient(0, by - R * 3.5, 0, by + R * 0.4);
      shaft.addColorStop(0, 'rgba(0,0,0,0)');
      shaft.addColorStop(0.7, K.rgba(P.beacon, 0.10));
      shaft.addColorStop(1, K.rgba(K.mix(P.beacon, '#fff', 0.5), 0.22));
      x.fillStyle = shaft;
      x.beginPath();
      x.moveTo(bx - R * 0.12, by - R * 3.5); x.lineTo(bx + R * 0.12, by - R * 3.5);
      x.lineTo(bx + R * 0.9, by + R * 0.4); x.lineTo(bx - R * 0.9, by + R * 0.4);
      x.closePath(); x.fill();
      const g = x.createRadialGradient(bx, by, 0, bx, by, R);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, K.mix(P.beacon, '#fff', 0.4)); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, R, 0, Math.PI * 2); x.fill();
    } else if (kind === 'Rift') {
      // a tall vertical tear of light
      x.globalCompositeOperation = 'lighter';
      const h = R * 3.4, w = R * 0.5;
      const g = x.createLinearGradient(bx, by - h, bx, by);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, K.rgba(P.beacon, 0.5));
      g.addColorStop(1, K.rgba(K.mix(P.beacon, '#fff', 0.5), 0.7));
      x.beginPath();
      x.moveTo(bx, by - h);
      x.quadraticCurveTo(bx + w, by - h * 0.5, bx + w * 0.3, by);
      x.quadraticCurveTo(bx - w, by - h * 0.5, bx, by - h);
      x.closePath();
      x.fillStyle = g; x.fill();
      // bright core
      const cg = x.createLinearGradient(bx, by - h, bx, by);
      cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(0.6, K.rgba('#ffffff', 0.5)); cg.addColorStop(1, K.rgba('#ffffff', 0.85));
      x.fillStyle = cg; x.lineWidth = 2;
      x.beginPath(); x.moveTo(bx, by - h); x.lineTo(bx + w * 0.12, by); x.lineTo(bx - w * 0.12, by); x.closePath(); x.fill();
    } else {
      // Gate: a tall trapezoid archway glowing from within
      x.globalCompositeOperation = 'lighter';
      const gw = R * 1.3, gh = R * 2.0;
      const g = x.createLinearGradient(bx, by, bx, by - gh);
      g.addColorStop(0, K.rgba(K.mix(P.beacon, '#fff', 0.5), 0.8));
      g.addColorStop(0.7, K.rgba(P.beacon, 0.4));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(bx - gw * 0.5, by);
      x.lineTo(bx - gw * 0.34, by - gh);
      x.lineTo(bx + gw * 0.34, by - gh);
      x.lineTo(bx + gw * 0.5, by);
      x.closePath(); x.fill();
      // hot inner core
      const cg = x.createRadialGradient(bx, by - gh * 0.4, 0, bx, by - gh * 0.4, gw * 0.5);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.5, K.mix(P.beacon, '#fff', 0.3)); cg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = cg; x.fillRect(bx - gw, by - gh, gw * 2, gh);
    }
    x.restore();
  }

  /* ── a single robed/abstract figure silhouette at scale s (1=near .. 0=far) ──
       drawn as an ink silhouette with optional pole + lantern glow ── */
  function figure(x, P, fx, fy, scale, r, opts) {
    opts = opts || {};
    const sil = K.mix(P.ink, P.sky2, 0.06 + scale * 0.03);
    const h = (30 + r() * 40) * scale; // body height in px (already scaled)
    const w = h * (0.30 + r() * 0.14);
    const headY = fy - h * 0.82;
    const hr = w * 0.30;
    // soft contact shadow on the ground
    K.softShadow(x, fx, fy + h * 0.02, w * 1.4, 0.30 * scale + 0.08);

    // build the robe path once so we can fill + rim it
    function robePath() {
      x.beginPath();
      x.moveTo(fx - w * 0.5, fy);
      x.quadraticCurveTo(fx - w * 0.42, fy - h * 0.55, fx - w * 0.16, fy - h * 0.78);
      x.lineTo(fx - hr * 0.7, fy - h * 0.80);
      x.quadraticCurveTo(fx - hr, headY - hr * 0.4, fx, headY - hr * 0.8);
      x.quadraticCurveTo(fx + hr, headY - hr * 0.4, fx + hr * 0.7, fy - h * 0.80);
      x.lineTo(fx + w * 0.16, fy - h * 0.78);
      x.quadraticCurveTo(fx + w * 0.42, fy - h * 0.55, fx + w * 0.5, fy);
      x.closePath();
    }

    x.save(); x.fillStyle = sil; robePath(); x.fill(); x.restore();

    // backlit gold rim — light from the beacon catches the figure's far edge.
    // only worth it on figures with enough size to show.
    if (scale > 0.28) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      const rimSide = opts.beaconLeft ? -1 : 1;
      x.strokeStyle = K.rgba(K.mix(P.beacon, '#fff', 0.2), 0.18 + scale * 0.18);
      x.lineWidth = Math.max(0.5, 1.2 * scale);
      x.save();
      // clip to a half on the beacon side so only that edge lights
      x.beginPath();
      if (rimSide < 0) x.rect(fx - w * 1.5, headY - hr * 2, w * 1.5 + w * 0.18, h + hr * 2);
      else x.rect(fx - w * 0.18, headY - hr * 2, w * 1.5, h + hr * 2);
      x.clip();
      robePath(); x.stroke();
      x.restore();
      x.restore();
    }

    // carried pole / standard with a lantern glow at top
    if (opts.pole) {
      const poleH = h * (1.3 + r() * 0.9);
      const px = fx + w * (0.2 + r() * 0.2) * (r() < 0.5 ? -1 : 1);
      const topY = fy - poleH;
      x.save();
      x.strokeStyle = K.mix(P.ink, P.sky2, 0.05);
      x.lineWidth = Math.max(0.6, 2.0 * scale);
      x.beginPath(); x.moveTo(px, fy - h * 0.5); x.lineTo(px, topY); x.stroke();
      x.restore();
      if (opts.banner) {
        // a hanging banner cloth from the pole — varied colour, gentle drape,
        // forked/tattered tail. Lean toward gold/ember, some deep indigo.
        const side = r() < 0.5 ? -1 : 1;
        const bw = w * (0.8 + r() * 0.6) * side, bh = h * (0.55 + r() * 0.4);
        const sag = bh * (0.12 + r() * 0.12);
        const cloth = r() < 0.55 ? K.mix(P.ember, P.beacon, r() * 0.6)
                    : r() < 0.7 ? K.mix(P.beacon, P.ink, 0.25)
                    : K.mix(P.sky2, P.ink, 0.2);
        x.save();
        x.fillStyle = K.rgba(cloth, 0.42 + r() * 0.22);
        x.beginPath();
        x.moveTo(px, topY + bh * 0.08);
        x.lineTo(px + bw, topY + bh * 0.08 + sag * 0.4);
        x.lineTo(px + bw, topY + bh);
        // forked tail
        x.lineTo(px + bw * 0.78, topY + bh * (0.72 + r() * 0.12));
        x.lineTo(px + bw * 0.5, topY + bh);
        x.lineTo(px + bw * 0.24, topY + bh * (0.72 + r() * 0.12));
        x.lineTo(px, topY + bh - sag);
        x.closePath(); x.fill();
        x.restore();
      }
      if (opts.lantern) lantern(x, P, px, topY, scale, r);
    } else if (opts.lantern) {
      // a low carried lantern at the side
      lantern(x, P, fx + w * 0.45, fy - h * 0.45, scale, r);
    }
  }

  /* ── a glowing gold lantern point — tight hot core, restrained halo so it
       reads as a carried light, not a fuzzy orb ── */
  function lantern(x, P, lx, ly, scale, r) {
    const rad = (1.4 + r() * 1.4) * (0.5 + scale * 0.9);
    K.bloom(x, lx, ly, rad * 4.5, P.lantern, 0.16);
    K.bloom(x, lx, ly, rad * 2.0, K.mix(P.lantern, '#fff', 0.35), 0.26);
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(lx, ly, 0, lx, ly, rad * 1.4);
    g.addColorStop(0, '#fff'); g.addColorStop(0.45, K.mix(P.lantern, '#fff', 0.25)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(lx, ly, rad * 1.4, 0, Math.PI * 2); x.fill();
    x.restore();
  }

  /* ── a beast of burden: a low, long-backed abstract silhouette ── */
  function beast(x, P, fx, fy, scale, r) {
    const sil = K.mix(P.ink, P.sky2, 0.08);
    const bw = (50 + r() * 30) * scale, bh = (24 + r() * 14) * scale;
    K.softShadow(x, fx, fy + bh * 0.05, bw * 0.9, 0.30 * scale + 0.08);
    x.save();
    x.fillStyle = sil;
    x.beginPath();
    // four stubby legs + a humped back + low head
    x.moveTo(fx - bw * 0.5, fy);
    x.lineTo(fx - bw * 0.5, fy - bh * 0.5);
    x.quadraticCurveTo(fx - bw * 0.55, fy - bh * 1.0, fx - bw * 0.62, fy - bh * 0.9); // head down
    x.quadraticCurveTo(fx - bw * 0.4, fy - bh * 1.25, fx, fy - bh * 1.15);
    x.quadraticCurveTo(fx + bw * 0.4, fy - bh * 1.3, fx + bw * 0.5, fy - bh * 0.5);
    x.lineTo(fx + bw * 0.5, fy);
    x.lineTo(fx + bw * 0.3, fy);
    x.lineTo(fx + bw * 0.3, fy - bh * 0.4);
    x.lineTo(fx + bw * 0.12, fy - bh * 0.4);
    x.lineTo(fx + bw * 0.12, fy);
    x.lineTo(fx - bw * 0.18, fy);
    x.lineTo(fx - bw * 0.18, fy - bh * 0.4);
    x.lineTo(fx - bw * 0.34, fy - bh * 0.4);
    x.lineTo(fx - bw * 0.34, fy);
    x.closePath(); x.fill();
    x.restore();
  }

  /* ── THE PROCESSION: a winding path from foreground to the beacon, with
       receding scale; figures, beasts, poles & lanterns spaced along it ── */
  function procession(x, P, W, H, hY, bx, by, p, r, noise) {
    // path control: starts wide in foreground, converges to the beacon.
    // we parameterise by t in [0,1], 0 = far (at beacon), 1 = near (foreground).
    const startX = W * (0.12 + r() * 0.18) * (r() < 0.5 ? 1 : 1); // foreground entry
    const fgX = W * (0.30 + r() * 0.40);
    const swayAmp = W * (0.14 + r() * 0.16);
    const swayFreq = 1.4 + r() * 1.8;
    const swayPhase = r() * Math.PI * 2;

    function pathAt(t) {
      // t: 0 far(beacon) -> 1 near(foreground bottom)
      // y interpolates from beacon to bottom with perspective easing
      const ey = Math.pow(t, 1.7); // ease so it bunches near horizon
      const y = by + (H * 1.02 - by) * ey;
      // x interpolates beacon -> foreground entry, plus a sway that grows near
      const baseX = bx + (fgX - bx) * ey;
      const sway = Math.sin(t * swayFreq * Math.PI + swayPhase) * swayAmp * Math.pow(t, 1.3);
      return [baseX + sway, y];
    }

    // collect members along the path. Each path point spawns several abreast so
    // the column has real body — sparse single-file far away, a teeming crowd
    // several wide in the foreground.
    const members = [];
    const STEPS = K.rint(r, 90, 130);
    for (let i = 0; i < STEPS; i++) {
      const u = i / STEPS;
      const t = Math.pow(u, 1.5); // more samples near t=0 (far)
      const [px, py] = pathAt(t);
      if (py < by + 2) continue;
      const scale = K.clamp(0.05 + t * 1.35, 0.05, 1.45);
      // column width grows with nearness — how many figures stand abreast here
      const colW = 6 + t * t * (90 + r() * 60);
      const abreast = t < 0.25 ? 1 : t < 0.5 ? K.rint(r, 1, 2) : t < 0.75 ? K.rint(r, 2, 4) : K.rint(r, 3, 6);
      for (let a = 0; a < abreast; a++) {
        const off = abreast === 1 ? (r() - 0.5) * (6 + scale * 20) : (a / (abreast - 1) - 0.5) * colW + (r() - 0.5) * colW * 0.3;
        const depthJit = (r() - 0.5) * (4 + scale * 24);
        const sJit = 1 + (r() - 0.5) * 0.28;
        members.push({ t, x: px + off, y: py + depthJit, scale: K.clamp(scale * sJit, 0.05, 1.6) });
      }
    }
    // draw far → near (painter's algorithm)
    members.sort((a, b) => a.y - b.y);

    for (const m of members) {
      const beaconLeft = bx < m.x;
      // far specks (tiny scale): draw as crisp little dark marks, occasional lantern
      if (m.scale < 0.16) {
        x.save();
        x.fillStyle = K.mix(P.ink, P.sky2, 0.12);
        const sw = Math.max(1, 3 * m.scale + 0.6), sh = Math.max(1.5, 9 * m.scale + 1);
        x.fillRect(m.x - sw / 2, m.y - sh, sw, sh);
        x.restore();
        if (r() < 0.34) lantern(x, P, m.x, m.y - sh * 0.7, m.scale, r);
        continue;
      }
      const isBeast = p.beasts && m.scale > 0.4 && r() < 0.12;
      if (isBeast) { beast(x, P, m.x, m.y, m.scale, r); continue; }
      const hasPole = r() < (0.30 + m.scale * 0.12);
      const hasLantern = r() < (0.28 + m.scale * 0.18);
      const hasBanner = p.banners && hasPole && r() < 0.4;
      figure(x, P, m.x, m.y, m.scale, r, {
        pole: hasPole,
        lantern: hasLantern || (hasPole && r() < 0.45),
        banner: hasBanner,
        beaconLeft,
      });
    }

    // a few large HERO silhouettes anchoring the near foreground for scale —
    // standard-bearers leading the column out of frame at the bottom.
    const heroes = K.rint(r, 2, 4);
    for (let i = 0; i < heroes; i++) {
      const [hx, hy] = pathAt(0.92 + r() * 0.08);
      const off = (r() - 0.5) * W * 0.16;
      const hxJ = hx + off;
      const sc = 1.35 + r() * 0.6;
      figure(x, P, hxJ, Math.min(H * 1.02, hy + (r() - 0.5) * 30), sc, r, {
        pole: r() < 0.75,
        lantern: r() < 0.7,
        banner: p.banners && r() < 0.55,
        beaconLeft: bx < hxJ,
      });
    }
  }

  /* ── volumetric dust haze hanging over the line + atmosphere ── */
  function dust(x, P, W, H, hY, noise, r) {
    // big slow haze strata above the plain
    K.hazeSheet(x, W, Math.floor(hY * 1.18), noise, K.mix(P.sky2, P.plain, 0.4), 0.12, 460 + r() * 200, 'screen');
    // warmer dust near the horizon line where the light scatters
    x.save(); x.globalCompositeOperation = 'screen';
    const hg = x.createLinearGradient(0, hY - H * 0.10, 0, hY + H * 0.18);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.4, K.rgba(K.mix(P.beacon, P.sky2, 0.6), 0.10));
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hg; x.fillRect(0, hY - H * 0.10, W, H * 0.30);
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hY = H * (p.fmt.t === 'Portal' ? 0.50 : 0.42) + (r() - 0.5) * H * 0.05;
    const beaconX = W * (0.30 + r() * 0.40);
    const beaconY = hY - H * (0.01 + r() * 0.02);

    // 1. sky
    sky(x, P, W, H, hY, beaconX);
    stars(x, P, W, hY, r);
    // 2. moons (behind dust)
    for (let i = 0; i < p.moons; i++) {
      const mr = W * (0.03 + r() * 0.05);
      const mx = r() * W, my = hY * (0.18 + r() * 0.45);
      moon(x, P, noise, mx, my, mr, r);
    }
    // 3. high haze sheet to sink moons/stars into atmosphere
    K.hazeSheet(x, W, Math.floor(hY), noise, K.mix(P.sky2, P.sky1, 0.5), 0.07, 320, 'screen');
    // 3b. soft horizontal dust strata hanging in the lower sky
    x.save(); x.globalCompositeOperation = 'screen';
    const nStrata = K.rint(r, 4, 7);
    for (let i = 0; i < nStrata; i++) {
      const t = i / nStrata;
      const yc = hY * (0.55 + 0.42 * t) - r() * 10;
      const hh = 14 + r() * 46 * (0.5 + t);
      const a = (0.04 + t * 0.07) * (0.6 + r() * 0.6);
      const col = K.mix(P.sky2, K.mix(P.beacon, P.plain, 0.5), t * 0.5);
      const gg = x.createLinearGradient(0, yc - hh, 0, yc + hh);
      gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, K.rgba(col, a)); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg;
      x.beginPath(); x.moveTo(0, yc - hh);
      for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, yc - hh + noise.fbm(xx / 240, i * 3.3, 3) * 18);
      for (let xx = W; xx >= 0; xx -= 24) x.lineTo(xx, yc + hh + noise.fbm(xx / 220, i * 3.3 + 7, 3) * 18);
      x.closePath(); x.fill();
    }
    x.restore();
    // 4. the plain
    plain(x, P, W, H, hY, r, noise, beaconX);
    // 5. the destination glow (behind the procession on horizon)
    destination(x, P, W, H, hY, beaconX, beaconY, p.dest, r, noise);
    if (p.event === 'Twin Beacons') destination(x, P, W, H, hY, W * (0.55 + r() * 0.2), beaconY + 4, 'Beacon', r, noise);
    // 6. dust haze over the line (front of beacon, behind near figures partly)
    dust(x, P, W, H, hY, noise, r);
    // 7. the procession
    procession(x, P, W, H, hY, beaconX, beaconY, p, r, noise);
    // 8. a foreground dust veil to push the near figures into atmosphere a touch
    x.save(); x.globalCompositeOperation = 'screen';
    K.hazeSheet(x, W, H, noise, K.mix(P.plain, P.sky2, 0.3), 0.05, 260, 'screen');
    x.restore();

    // events
    if (p.event === 'Falling Star') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const sx = W * (0.6 + r() * 0.3), sy = hY * 0.2, len = W * 0.2;
      const g = x.createLinearGradient(sx, sy, sx - len, sy - len * 0.5);
      g.addColorStop(0, K.rgba('#fff', 0.9)); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.strokeStyle = g; x.lineWidth = 2.5; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx - len, sy - len * 0.5); x.stroke();
      x.restore();
    }
    if (p.event === 'Storm of Dust') {
      K.hazeSheet(x, W, H, noise, K.mix(P.plain, P.ink, 0.3), 0.14, 180, 'multiply');
    }

    // finishing atmosphere
    K.hazeSheet(x, W, H, noise, P.sky2, 0.04, 220, 'screen');
    // painterly dust flecks
    x.save(); x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < Math.floor(W * H / 2400); i++) {
      const dx = r() * W, dy = r() * H, s = 0.6 + r() * 2.2;
      const c = r() < 0.5 ? K.mix(P.sky2, '#fff', 0.4) : K.mix(P.plain, P.ink, 0.5);
      x.fillStyle = K.rgba(c, 0.03 + r() * 0.06);
      x.beginPath(); x.arc(dx, dy, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    // floating motes / embers near the horizon glow
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const mx = beaconX + (r() - 0.5) * W * 0.5, my = hY - r() * hY * 0.4;
      x.fillStyle = K.rgba(r() < 0.3 ? P.ember : P.lantern, 0.06 + r() * 0.22);
      x.beginPath(); x.arc(mx, my, 0.5 + r() * 1.6, 0, Math.PI * 2); x.fill();
    }
    x.restore();

    K.grain(x, W, H, 540, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.34); x.restore();
    // top darkening for depth
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(K.mix(P.sky1, '#000', 0.5), 0.30)); tg.addColorStop(0.4, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 't_procession', draw, traits };
})();
