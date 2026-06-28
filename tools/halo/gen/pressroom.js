/* PRESSROOM — a dense isometric metropolis printed as a mis-registered risograph.
 * Stacked iso buildings, overpasses, tiny figures — but the three ink layers
 * (fluoro pink / riso blue / riso yellow) are shifted off-register, halftone
 * dots show through, ink over-saturates and bleeds, and a whole district is
 * printed twice — ghosted. The misprint IS the world. Flat-bright PRINT inks
 * on warm bone paper; the odd one out among the haze-worlds on purpose.
 * PALETTE: RISO FLUORO — fluoro pink #ff48a0 / riso blue #2a4bff / riso yellow
 * #ffd21e, on warm bone #efe7d6. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Each colorway = the three ink channels + paper. All flat-bright riso inks.
  // We keep PINK/BLUE/YELLOW roles so misregister + multiply read consistently,
  // but swap the actual inks per colorway for distinct moods inside the family.
  const PALS = [
    { name: 'Riso Fluoro',   paper: '#efe7d6', ink: ['#ff48a0', '#2a4bff', '#ffd21e'] },
    { name: 'Press Cyan',    paper: '#ece9dd', ink: ['#ff3d7f', '#0bb5d6', '#ffcf1a'] },
    { name: 'Acid Tangerine',paper: '#f1e9d4', ink: ['#ff5a2e', '#2a4bff', '#ffe23a'] },
    { name: 'Violet Run',    paper: '#ebe4d8', ink: ['#ff48a0', '#7b2cf0', '#33d6a6'] },
    { name: 'Bone & Berry',  paper: '#f2ecdc', ink: ['#e0286e', '#3550e6', '#1fb37a'] },
    { name: 'Newsprint',     paper: '#e8e2cf', ink: ['#ff6b9d', '#2563ff', '#ffc933'] },
  ];
  const FMTS = [
    { W: 1320, H: 1180, t: 'Spread' },
    { W: 1240, H: 1400, t: 'Folio' },
    { W: 1280, H: 1280, t: 'Plate' },
  ];
  const RUNS = ['First Pull', 'Heavy Ink', 'Faded Run', 'Double Print'];
  const SKEWS = ['Square Tilt', 'Steep Tilt', 'Long Avenue'];

  function params(r) {
    const pal = K.pick(PALS, r);
    const fmt = K.pick(FMTS, r);
    return {
      pal, fmt,
      run: K.pick(RUNS, r),
      skew: K.pick(SKEWS, r),
      // misregister magnitude per channel (px) — the signature flaw
      mis: 3 + r() * 5,
      // halftone dot pitch
      dot: 5 + r() * 3,
      // grid density of the city
      cols: K.rint(r, 11, 15),
      rows: K.rint(r, 13, 18),
      // where the focal tower cluster sits (composition variety)
      focalC: 0.25 + r() * 0.5,
      focalR: 0.30 + r() * 0.4,
      // does a ghost district print twice this seed
      ghost: r() < 0.78,
      tiltSign: r() < 0.5 ? -1 : 1,
      seedR: r,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Run: p.run,
      Tilt: p.skew,
      Ghosting: p.ghost ? 'Double-Printed' : 'Clean Pull',
    };
  }

  // ── Halftone: render a flat ink region as a dot grid, dot size ∝ coverage.
  // We stamp dots only where a mask alpha exists; here we approximate by just
  // tinting the whole already-painted layer with a multiply dot screen so the
  // print texture reads everywhere. Used as an overlay pass per channel.
  function halftoneScreen(x, W, H, pitch, angle, col, strength, r, atop) {
    x.save();
    // 'source-atop' → dots only land where ink already exists (per-plate);
    // 'multiply' → global screen over the whole composited page.
    x.globalCompositeOperation = atop ? 'source-atop' : 'multiply';
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const c = K.h2r(col);
    const fill = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    // iterate over a rotated lattice covering the canvas
    const diag = Math.sqrt(W * W + H * H);
    for (let v = -diag; v < diag; v += pitch) {
      for (let u = -diag; u < diag; u += pitch) {
        const px = W / 2 + u * ca - v * sa;
        const py = H / 2 + u * sa + v * ca;
        if (px < -pitch || px > W + pitch || py < -pitch || py > H + pitch) continue;
        const rad = pitch * (0.10 + 0.18 * strength);
        x.globalAlpha = strength * (0.5 + r() * 0.5);
        x.fillStyle = fill;
        x.beginPath();
        x.arc(px, py, rad, 0, 7);
        x.fill();
      }
    }
    x.restore();
  }

  // Iso projection: grid (gc, gr) → screen. Slight global tilt applied outside.
  // Returns the top-center of a tile column footprint.
  function iso(gc, gr, ox, oy, tw, th) {
    return {
      x: ox + (gc - gr) * tw * 0.5,
      y: oy + (gc + gr) * th * 0.5,
    };
  }

  // Draw a single iso building as a flat block in ONE ink (a layer), at grid
  // (gc,gr) with height `h` (px). Three faces; footprint inset by `fp` (0..1)
  // so paper streets show between blocks. Faces are SOLID flat fills — top
  // brightest (ink→paper), left mid (pure ink), right darkest (ink→shadow) —
  // giving riso volume while staying flat-bright. `cols` = {top,left,right}.
  function isoBox(x, gc, gr, ox, oy, tw, th, h, cols, fp) {
    const b = iso(gc, gr, ox, oy, tw, th);
    const hw = tw * 0.5 * fp, hh = th * 0.5 * fp;
    // top face (rhombus) at the building roof
    const tN = { x: b.x, y: b.y - h - hh };
    const tE = { x: b.x + hw, y: b.y - h };
    const tS = { x: b.x, y: b.y - h + hh };
    const tW = { x: b.x - hw, y: b.y - h };
    // bottom edge points (footprint, also inset)
    const bE = { x: b.x + hw, y: b.y };
    const bS = { x: b.x, y: b.y + hh };
    const bW = { x: b.x - hw, y: b.y };

    // left face (the lit-ish SW wall)
    x.beginPath();
    x.moveTo(tW.x, tW.y); x.lineTo(tS.x, tS.y); x.lineTo(bS.x, bS.y); x.lineTo(bW.x, bW.y); x.closePath();
    x.fillStyle = cols.left; x.fill();
    // right face (shadow SE wall)
    x.beginPath();
    x.moveTo(tS.x, tS.y); x.lineTo(tE.x, tE.y); x.lineTo(bE.x, bE.y); x.lineTo(bS.x, bS.y); x.closePath();
    x.fillStyle = cols.right; x.fill();
    // top face (roof, brightest)
    x.beginPath();
    x.moveTo(tN.x, tN.y); x.lineTo(tE.x, tE.y); x.lineTo(tS.x, tS.y); x.lineTo(tW.x, tW.y); x.closePath();
    x.fillStyle = cols.top; x.fill();
    return { tN, tS, tE, tW, bS, bE, bW, base: b, h, hw, hh };
  }

  // Paint the whole city onto context `x`. Each building is assigned ONE of the
  // 3 inks (a bright flat-color mosaic). When `chanFilter` is set (0/1/2) we
  // paint ONLY buildings of that ink — used to separate the city into 3 plates
  // that we then composite back with per-channel MISREGISTER offsets. `paper`
  // tints the bright roof face. Returns nothing; deterministic in p.seed.
  function paintCity(x, W, H, p, inks, paper, density, chanFilter) {
    const r = K.rng(((p.seed >>> 0) * 2654435761) >>> 0 || 1);
    const tw = W / (p.cols * 0.92);
    const th = tw * 0.5;
    const fp = 0.80; // footprint inset → paper streets between blocks
    const tilt = (p.skew === 'Steep Tilt' ? 0.07 : p.skew === 'Long Avenue' ? 0.02 : 0.04) * p.tiltSign;

    const spanY = (p.cols + p.rows) * th * 0.5;
    const ox = W * 0.5 + (p.rows - p.cols) * tw * 0.25;
    const oy = H * 0.5 - spanY * 0.5 + H * 0.16;

    x.save();
    x.translate(W / 2, H / 2);
    x.rotate(tilt);
    x.translate(-W / 2, -H / 2);

    const noise = K.makeNoise(((p.seed >>> 0) + 3) >>> 0 || 1);
    const fc = p.focalC * p.cols, fr = p.focalR * p.rows;

    // assign each tile a channel deterministically: bias by region so colors
    // pool into districts (not salt-and-pepper) — a few coherent ink zones.
    function chanOf(gc, gr) {
      const z = noise.fbm(gc * 0.28 + 40, gr * 0.28 + 70, 2); // -1..1
      const base = z < -0.18 ? 0 : z > 0.18 ? 1 : 2;
      // jitter ~25% of tiles to a neighbor channel for print-y mixing
      const jr = noise.noise2(gc * 1.7 + 5, gr * 1.7 + 9);
      if (jr > 0.55) return (base + 1) % 3;
      if (jr < -0.55) return (base + 2) % 3;
      return base;
    }

    const cells = [];
    for (let gr = 0; gr < p.rows; gr++)
      for (let gc = 0; gc < p.cols; gc++) cells.push([gc, gr]);
    cells.sort((a, b2) => (a[0] + a[1]) - (b2[0] + b2[1]));

    for (const [gc, gr] of cells) {
      const street = (noise.fbm(gc * 0.5, gr * 0.5, 3) + 1) / 2;
      if (street < 0.18) continue;
      const ch = chanOf(gc, gr);
      if (chanFilter != null && ch !== chanFilter) continue;
      const ink = inks[ch];
      const cols = {
        top: K.mix(ink, paper, 0.40),
        left: ink,
        right: K.mix(ink, '#3a2030', 0.30),
      };
      const dCluster = Math.hypot((gc - fc) / p.cols, (gr - fr) / p.rows);
      const falloff = K.clamp(1 - dCluster * 1.7, 0.05, 1);
      const baseN = (noise.fbm(gc * 0.8 + 11, gr * 0.8 + 5, 4) + 1) / 2;
      let h = th * (0.9 + (baseN * 2.4 + Math.pow(falloff, 1.7) * 6.2) * (0.6 + density * 0.5));
      if (street < 0.32) h *= 0.45;
      h = Math.max(th * 0.5, h);

      const box = isoBox(x, gc, gr, ox, oy, tw, th, h, cols, fp);

      // window rows on the SE wall: clip to the wall quad, then stripe.
      if (h > th * 2.2) {
        x.save();
        x.beginPath();
        x.moveTo(box.tS.x, box.tS.y); x.lineTo(box.tE.x, box.tE.y);
        x.lineTo(box.bE.x, box.bE.y); x.lineTo(box.bS.x, box.bS.y); x.closePath();
        x.clip();
        x.fillStyle = K.mix(ink, paper, 0.55);
        const floors = Math.min(18, Math.floor(h / (th * 0.7)));
        for (let f = 1; f < floors; f++) {
          const yy = box.tS.y - h + (h * f) / floors;
          x.globalAlpha = (f % 2) ? 0.4 : 0.18;
          x.fillRect(box.tW.x, yy, tw * fp, th * 0.05);
        }
        x.globalAlpha = 1;
        x.restore();
      }
    }

    // overpasses: elevated iso road decks crossing the field.
    const passes = K.rint(r, 2, 3);
    for (let pI = 0; pI < passes; pI++) {
      const pch = K.rint(r, 0, 2);
      if (chanFilter != null && pch !== chanFilter) { r(); r(); r(); r(); continue; }
      const ink = inks[pch];
      const gr0 = K.rint(r, 1, p.rows - 2);
      const gc0 = K.rint(r, 0, 2);
      const len = K.rint(r, Math.floor(p.cols * 0.45), p.cols - 1);
      const lift = th * (2.5 + r() * 3.5);
      const a0 = iso(gc0, gr0, ox, oy, tw, th);
      const a1 = iso(gc0 + len, gr0 + (r() < 0.5 ? 0 : 2), ox, oy, tw, th);
      const wdt = th * 0.5;
      x.fillStyle = K.mix(ink, '#241225', 0.40);
      const legs = 5;
      for (let li = 0; li <= legs; li++) {
        const t = li / legs;
        const lx = a0.x + (a1.x - a0.x) * t;
        const ly = a0.y + (a1.y - a0.y) * t;
        x.fillRect(lx - wdt * 0.1, ly - lift + wdt, wdt * 0.2, lift);
      }
      x.fillStyle = ink;
      x.beginPath();
      x.moveTo(a0.x, a0.y - lift); x.lineTo(a1.x, a1.y - lift);
      x.lineTo(a1.x, a1.y - lift + wdt); x.lineTo(a0.x, a0.y - lift + wdt);
      x.closePath(); x.fill();
      x.fillStyle = K.mix(ink, paper, 0.34);
      x.fillRect(Math.min(a0.x, a1.x), Math.min(a0.y, a1.y) - lift, Math.abs(a1.x - a0.x), 2);
    }

    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const p = params(r);
    p.seed = seed;
    const P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    const heavy = p.run === 'Heavy Ink';
    const faded = p.run === 'Faded Run';
    const doublePrint = p.run === 'Double Print';

    // ── 1. PAPER: warm bone, with subtle uneven tone (stock texture)
    x.fillStyle = P.paper;
    x.fillRect(0, 0, W, H);
    // paper mottle: faint warm/cool blotches so it isn't dead flat
    x.save();
    x.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 30; i++) {
      const bx = r() * W, by = r() * H, br = 120 + r() * 360;
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, K.rgba(K.mix(P.paper, '#bcae8e', 0.5), 0.06));
      g.addColorStop(1, K.rgba(P.paper, 0));
      x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    x.restore();

    // ── 2. THREE INK PLATES. The city is a bright mosaic of pink/blue/yellow
    // buildings; we separate it into one canvas per ink, halftone each, then
    // composite back with a per-channel MISREGISTER offset so each ink lands
    // slightly off — bold colored fringes where blocks meet, the riso flaw.
    const densities = faded ? 0.75 : heavy ? 1.2 : 1.0;
    const ang0 = r() * Math.PI * 2;
    const misVecs = [0, 1, 2].map((i) => {
      const a = ang0 + i * (Math.PI * 2 / 3) + (r() - 0.5) * 0.6;
      const m = p.mis * (0.7 + r() * 0.7);
      return [Math.cos(a) * m, Math.sin(a) * m];
    });

    // helper to render one channel's plate (city of just that ink) → canvas
    function plate(ci, dens) {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const ox2 = off.getContext('2d');
      paintCity(ox2, W, H, p, P.ink, P.paper, dens, ci);
      // halftone: dots of darker ink only where the plate has ink.
      halftoneScreen(ox2, W, H, p.dot + ci * 0.7, (15 + ci * 30) * Math.PI / 180,
        K.mix(P.ink[ci], '#000', 0.4), faded ? 0.18 : 0.26, K.rng(seed + ci * 7 + 1), true);
      return off;
    }

    for (let ci = 0; ci < 3; ci++) {
      const off = plate(ci, densities);
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.globalAlpha = faded ? 0.8 : 0.92;
      const [mx, my] = misVecs[ci];
      x.drawImage(off, mx, my);
      x.restore();
    }

    // ── 3. GHOST DISTRICT — a whole sub-region printed twice: re-stamp ALL
    // three plates inside a clipped band, shoved at a big offset & low alpha,
    // so that district reads as a ghosted double-print smear.
    if (p.ghost || doublePrint) {
      const gx0 = (0.06 + r() * 0.45) * W;
      const gy0 = (0.18 + r() * 0.4) * H;
      const gw = (0.32 + r() * 0.3) * W;
      const gh = (0.3 + r() * 0.32) * H;
      const ghostOff = p.mis * (3.0 + r() * 4.0);
      const ga = r() * Math.PI * 2;
      const gdx = Math.cos(ga) * ghostOff, gdy = Math.sin(ga) * ghostOff;
      for (let ci = 0; ci < 3; ci++) {
        const off = plate(ci, densities * 0.9);
        x.save();
        x.beginPath(); x.rect(gx0, gy0, gw, gh); x.clip();
        x.globalCompositeOperation = 'multiply';
        x.globalAlpha = doublePrint ? 0.4 : 0.3;
        x.drawImage(off, gdx, gdy);
        x.restore();
      }
    }

    // ── 4. TINY FIGURES along a couple of street lines — small ink ticks for
    // human scale, printed in one channel (slightly off-register too).
    x.save();
    x.globalCompositeOperation = 'multiply';
    const figCol = P.ink[0];
    const figN = K.rint(r, 30, 60);
    for (let i = 0; i < figN; i++) {
      const fx = r() * W;
      const fy = H * (0.55 + r() * 0.42);
      const fh = 4 + r() * 7;
      x.globalAlpha = 0.5 + r() * 0.3;
      x.fillStyle = K.pick([P.ink[0], P.ink[1]], r);
      x.fillRect(fx + (r() - 0.5) * p.mis, fy, fh * 0.34, fh);
      x.beginPath();
      x.arc(fx + fh * 0.17 + (r() - 0.5) * p.mis, fy - fh * 0.2, fh * 0.22, 0, 7);
      x.fill();
    }
    x.restore();

    // ── 5. INK BLEED / OVER-SATURATION blotches — where ink pooled too heavy,
    // a few dark saturated patches that bleed into the paper.
    if (heavy || r() < 0.5) {
      x.save();
      x.globalCompositeOperation = 'multiply';
      const blots = K.rint(r, 3, 7);
      for (let i = 0; i < blots; i++) {
        const bx = r() * W, by = H * (0.3 + r() * 0.6);
        const br = 30 + r() * 90;
        const bc = K.mix(P.ink[K.rint(r, 0, 2)], P.ink[K.rint(r, 0, 2)], 0.5);
        const g = x.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, K.rgba(bc, heavy ? 0.3 : 0.18));
        g.addColorStop(0.7, K.rgba(bc, 0.08));
        g.addColorStop(1, K.rgba(bc, 0));
        x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      x.restore();
    }

    // ── 6. ATMOSPHERIC PERSPECTIVE: the far (top) of the city fades toward
    // paper — desaturated, lower contrast, hazier. Bottom stays punchy.
    // (Distinct from the other worlds: this is paper-fog, not dark fog.)
    x.save();
    const fade = x.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0, K.rgba(P.paper, 0.42));
    fade.addColorStop(0.30, K.rgba(P.paper, 0.12));
    fade.addColorStop(0.55, K.rgba(P.paper, 0));
    x.fillStyle = fade; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 7. GLOBAL HALFTONE OVERLAY — a faint full-frame dot screen so the
    // whole image carries the print texture, plus paper grain.
    halftoneScreen(x, W, H, p.dot * 1.4, 45 * Math.PI / 180,
      K.mix(P.ink[2], '#000', 0.3), 0.05, K.rng(seed + 99));

    // misregister rainbow fringe at high-contrast edges via a light chroma split
    if (!faded) K.chromaSplit(x, W, H, Math.round(p.mis * 0.4));

    // paper grain — fine, like uncoated stock
    K.grain(x, W, H, 380, r);

    // very light vignette so the plate sits on the page (not a dark vignette —
    // a soft paper-edge darkening)
    x.save();
    x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35,
      W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, K.rgba(K.mix(P.paper, '#7a6f54', 0.6), 0.22));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'pressroom', draw, traits };
})();
