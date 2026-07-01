/* CABINET — a museum vitrine holding an impossible specimen.
 * SURREAL = real-but-off: a scholarly glass case, brass edges, a typed label
 * card — and inside, ONE broken law: a folded piece of horizon, a bottled
 * cloud, a knotted shadow, a pinned beam of light, a jar with a tiny sea.
 * Institutional, warm, textured, calm. Olive-glass / bone / brass / aged paper.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six palettes — all olive-glass / bone / brass / aged-paper / deep-shadow,
     but each a different room light, so the SET reads varied, never reskinned.
     wall=back of case, felt=specimen bed, glass=vitrine tint, brass=metal,
     paper=label card, ink=lettering, spec=specimen body, glow=interior light. */
  const PALS = [
    { name: 'Curator Olive', wall: '#3a3a2e', felt: '#4d513c', glass: '#6b7a52', brass: '#b08a3e', paper: '#d8cba8', ink: '#2e2b22', spec: '#c3bba0', glow: '#e8dcb0', shade: '#1d1c16' },
    { name: 'Bone Vitrine',  wall: '#cdc4ac', felt: '#b3ad92', glass: '#8a9a73', brass: '#c39a47', paper: '#ece2c6', ink: '#3a352a', spec: '#7d8a66', glow: '#fff4d6', shade: '#6a6450' },
    { name: 'Amber Study',   wall: '#42351f', felt: '#5a4424', glass: '#7a6a3a', brass: '#d8a85a', paper: '#e6d2a4', ink: '#2a2114', spec: '#c8aa6e', glow: '#ffcf86', shade: '#1a140b' },
    { name: 'Verdigris Case',wall: '#2c3a30', felt: '#37463a', glass: '#577a64', brass: '#a98a4e', paper: '#cfd0bc', ink: '#1e2a22', spec: '#a8b89a', glow: '#cfe6c4', shade: '#121b15' },
    { name: 'Smoke Cabinet', wall: '#2a2b2e', felt: '#34373a', glass: '#566064', brass: '#9a8044', paper: '#c6c4bc', ink: '#1a1b1e', spec: '#9aa0a4', glow: '#dfe6e8', shade: '#0d0e10' },
    { name: 'Foxed Folio',   wall: '#4a3d2e', felt: '#5c4e3a', glass: '#7c7448', brass: '#c2a04e', paper: '#e8dcc2', ink: '#34281a', spec: '#bcae8a', glow: '#f4e2b6', shade: '#1c1610' },
  ];

  const MODES = ['Bell Jar', 'Case Grid', 'Pinned Board', 'Single Pedestal', 'Liquid Jar', 'Label Study'];
  // surreal "impossible specimens"
  const SPECIMENS = ['Folded Horizon', 'Bottled Cloud', 'Knotted Shadow', 'Pinned Beam', 'A Tiny Sea', 'Caught Wind', 'Square Moon'];
  const FORMATS = [[1000, 1250], [1180, 1180]]; // portrait, square

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);
    const pal = pickPal(r);
    const mode = MODES[seed % MODES.length];        // deterministic spread of modes across seeds
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const specName = K.pick(SPECIMENS, r);
    const S = Math.min(W, H);

    // ── PER-OUTPUT LAYOUT RNG ─────────────────────────────────────
    // Everything below is drawn from r() AFTER the three traits-shared draws
    // (pal, fmt, specName) so traits() stays a pure mirror. These give every
    // output its own composition WITHIN its mode: where the hero sits, how big,
    // how tilted, how many, where the light falls, how the case is framed.
    const jit = (amt) => (r() - 0.5) * 2 * amt;        // symmetric jitter in [-amt,amt]
    const rng = (lo, hi) => lo + r() * (hi - lo);      // uniform range
    // hero placement: horizontal slide off-center + vertical lift, per output
    const heroDX = jit(W * 0.16);                       // case can sit left/right of center
    const heroDY = jit(S * 0.05);
    const heroCX = W * 0.5 + heroDX;                    // hero centre x
    const heroScale = rng(0.82, 1.22);                  // overall hero size multiplier
    const heroTilt = jit(0.05);                         // slight whole-case lean
    // light / gallery spot position (drives wall bloom + interior glow bias)
    const lightX = rng(0.30, 0.66);
    const lightY = rng(0.12, 0.26);
    // framing crop bias for vignette focus
    const vigFoc = rng(0.46, 0.60);
    // secondary scatter density (faint distant shelf forms, dust motes)
    const motes = 14 + (r() * 26 | 0);
    const ghostShelves = r() < 0.5 ? (1 + (r() * 2 | 0)) : 0;

    // ─────────────────────────────────────────────────────────────
    // BACKDROP — institutional wall: a low gallery light, warm at top,
    // sinking to deep shade at the floor. Painted, not flat.
    // ─────────────────────────────────────────────────────────────
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(pal.wall, pal.glow, 0.12));
    bg.addColorStop(0.42, K.mix(pal.wall, pal.shade, 0.12));
    bg.addColorStop(1, K.mix(pal.wall, pal.shade, 0.82));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // soft wall vignette of light from a per-output gallery spot — tight, not a wash
    K.bloom(x, W * lightX, H * lightY, S * rng(0.58, 0.82), pal.glow, 0.07);
    // faint distant ghost shelves / framed forms on the back wall (seeded scatter)
    for (let g = 0; g < ghostShelves; g++) {
      const gw = W * rng(0.10, 0.20), gh = gw * rng(0.7, 1.5);
      const gx = rng(0.05, 0.95) * W - gw / 2, gy = rng(0.10, 0.40) * H;
      x.fillStyle = K.rgba(K.mix(pal.wall, pal.shade, 0.4), 0.30);
      x.fillRect(gx, gy, gw, gh);
      x.strokeStyle = K.rgba(K.mix(pal.brass, pal.shade, 0.3), 0.18); x.lineWidth = 1;
      x.strokeRect(gx, gy, gw, gh);
    }
    // wall mottle (plaster / painted board)
    K.mottle(x, 0, 0, W, H, pal.wall, 30, r, 'overlay');

    // common geometry: a floor/shelf the case sits on
    const floorY = H * (0.80 + r() * 0.05);
    // floor plane (slightly warmer, lit)
    const fg = x.createLinearGradient(0, floorY, 0, H);
    fg.addColorStop(0, K.mix(pal.wall, pal.glow, 0.10));
    fg.addColorStop(1, K.mix(pal.wall, pal.shade, 0.55));
    x.fillStyle = fg; x.fillRect(0, floorY, W, H - floorY);
    // shelf lip shadow
    x.fillStyle = K.rgba(pal.shade, 0.45);
    x.fillRect(0, floorY, W, Math.max(2, S * 0.004));

    // ── small reusable helpers ──────────────────────────────────

    // brass frame with bevel (a metal edge around a rect)
    function brassEdge(bx, by, bw, bh, th) {
      // outer dark seat
      x.fillStyle = K.rgba(pal.shade, 0.5);
      x.fillRect(bx - th, by - th, bw + th * 2, bh + th * 2);
      // brass faces (top/left lit, bottom/right dark) — beveled rail look
      const lit = K.mix(pal.brass, pal.glow, 0.5);
      const dk = K.mix(pal.brass, pal.shade, 0.55);
      // top rail
      x.fillStyle = lit; x.fillRect(bx - th, by - th, bw + th * 2, th);
      // left rail
      x.fillStyle = K.mix(pal.brass, pal.glow, 0.25); x.fillRect(bx - th, by - th, th, bh + th * 2);
      // bottom rail
      x.fillStyle = dk; x.fillRect(bx - th, by + bh, bw + th * 2, th);
      // right rail
      x.fillStyle = K.mix(pal.brass, pal.shade, 0.35); x.fillRect(bx + bw, by - th, th, bh + th * 2);
      // brass corner brackets (little squares) for the institutional look
      const cs = th * 1.7;
      x.fillStyle = K.mix(pal.brass, pal.glow, 0.35);
      [[bx - th, by - th], [bx + bw + th - cs, by - th], [bx - th, by + bh + th - cs], [bx + bw + th - cs, by + bh + th - cs]].forEach((p) => {
        x.fillRect(p[0], p[1], cs, cs);
        x.fillStyle = K.rgba(pal.glow, 0.5); x.fillRect(p[0] + cs * 0.32, p[1] + cs * 0.32, cs * 0.18, cs * 0.18);
        x.fillStyle = K.mix(pal.brass, pal.glow, 0.35);
      });
    }

    // the tinted glass pane over an interior rect (felt-lined chamber)
    function glassChamber(bx, by, bw, bh, interiorPaint) {
      // back felt wall of the chamber (lit from a top interior glow)
      const cg = x.createLinearGradient(0, by, 0, by + bh);
      cg.addColorStop(0, K.mix(pal.felt, pal.glow, 0.22));
      cg.addColorStop(0.5, pal.felt);
      cg.addColorStop(1, K.mix(pal.felt, pal.shade, 0.5));
      x.fillStyle = cg; x.fillRect(bx, by, bw, bh);
      // interior top glow (museum case light)
      K.bloom(x, bx + bw * 0.5, by + bh * 0.08, bh * 0.9, pal.glow, 0.16);
      // felt texture
      K.mottle(x, bx, by, bw, bh, pal.felt, 22, r, 'overlay');
      // soft floor shadow inside chamber
      x.fillStyle = K.rgba(pal.shade, 0.3);
      x.fillRect(bx, by + bh * 0.86, bw, bh * 0.14);

      // ── the SPECIMEN gets painted here by caller ──
      if (interiorPaint) interiorPaint(bx, by, bw, bh);

      // GLASS overlay — olive tint + diagonal sheen reflections
      x.save();
      x.fillStyle = K.rgba(pal.glass, 0.16);
      x.fillRect(bx, by, bw, bh);
      // big soft diagonal reflection band
      x.globalCompositeOperation = 'screen';
      const ref = x.createLinearGradient(bx, by, bx + bw, by + bh);
      ref.addColorStop(0, K.rgba(pal.glow, 0.0));
      ref.addColorStop(0.34, K.rgba(pal.glow, 0.12));
      ref.addColorStop(0.4, K.rgba(pal.glow, 0.02));
      ref.addColorStop(0.62, K.rgba(pal.glow, 0.10));
      ref.addColorStop(0.7, K.rgba(pal.glow, 0.0));
      x.fillStyle = ref;
      x.beginPath();
      x.moveTo(bx + bw * 0.1, by); x.lineTo(bx + bw * 0.5, by);
      x.lineTo(bx + bw * 0.1, by + bh); x.lineTo(bx - bw * 0.3, by + bh);
      x.closePath(); x.fill();
      // thin top highlight line on the glass
      x.globalCompositeOperation = 'screen';
      x.fillStyle = K.rgba(pal.glow, 0.14); x.fillRect(bx, by, bw, Math.max(1, bh * 0.006));
      x.restore();
    }

    // a typed institutional label card lying or pinned somewhere
    function labelCard(lx, ly, lw, lh, rot, title) {
      x.save();
      x.translate(lx, ly); x.rotate(rot);
      // card shadow
      x.fillStyle = K.rgba(pal.shade, 0.4);
      x.fillRect(-lw / 2 + lh * 0.05, -lh / 2 + lh * 0.08, lw, lh);
      // paper
      const pg = x.createLinearGradient(0, -lh / 2, 0, lh / 2);
      pg.addColorStop(0, K.mix(pal.paper, '#ffffff', 0.12));
      pg.addColorStop(1, K.mix(pal.paper, pal.shade, 0.16));
      x.fillStyle = pg; x.fillRect(-lw / 2, -lh / 2, lw, lh);
      // foxing / paper mottle
      K.mottle(x, -lw / 2, -lh / 2, lw, lh, pal.paper, 30, r, 'multiply');
      // ruled header line
      x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = Math.max(1, lh * 0.012);
      x.beginPath(); x.moveTo(-lw / 2 + lw * 0.08, -lh * 0.22); x.lineTo(lw / 2 - lw * 0.08, -lh * 0.22); x.stroke();
      // faux typed lines (catalogue text) — varied lengths
      x.fillStyle = K.rgba(pal.ink, 0.62);
      const lh0 = lh * 0.07;
      // title block (bolder, shorter)
      x.fillRect(-lw / 2 + lw * 0.08, -lh * 0.40, lw * 0.5, lh0 * 1.4);
      const rowsN = 3 + (r() * 2 | 0);
      for (let i = 0; i < rowsN; i++) {
        const yy = -lh * 0.10 + i * lh0 * 1.9;
        const wfrac = 0.45 + r() * 0.4;
        x.fillStyle = K.rgba(pal.ink, 0.45);
        x.fillRect(-lw / 2 + lw * 0.08, yy, lw * 0.84 * wfrac, lh0);
      }
      // a little catalogue number stamp
      x.fillStyle = K.rgba(pal.brass, 0.85);
      x.beginPath(); x.arc(lw / 2 - lh * 0.32, lh / 2 - lh * 0.30, lh * 0.16, 0, 7); x.fill();
      x.restore();
    }

    // ── THE IMPOSSIBLE SPECIMEN (one of several), painted inside a rect ──
    function paintSpecimen(bx, by, bw, bh, kind, scale) {
      scale = scale || 1;
      // per-placement jitter so the specimen isn't dead-centred-constant
      const cx = bx + bw / 2 + (r() - 0.5) * bw * 0.14;
      const cy = by + bh * (0.50 + (r() - 0.5) * 0.10);
      const rad = Math.min(bw, bh) * 0.32 * scale * (0.86 + r() * 0.30);
      const specRot = (r() - 0.5) * 0.18;               // small lean for asymmetry
      x.save();
      // luminous specimens need a dark stage behind them so the light reads —
      // dim the whole chamber to near-shade for these.
      if (kind === 'Pinned Beam' || kind === 'Square Moon') {
        const deep = K.mix(pal.shade, '#000000', 0.55);  // force a truly dark stage
        const stage = x.createLinearGradient(0, by, 0, by + bh);
        stage.addColorStop(0, K.mix(deep, pal.glass, 0.18));
        stage.addColorStop(1, deep);
        x.fillStyle = stage; x.fillRect(bx, by, bw, bh);
        // faint cool rim light so the dark box still has depth
        K.bloom(x, cx, by + bh * 0.2, bh * 0.7, pal.glass, 0.1);
      }
      // contact shadow under specimen on the felt
      K.softShadow(x, cx, by + bh * 0.86, rad * 1.6, 0.5);

      if (kind === 'Folded Horizon') {
        // a square swatch of landscape — sky over sea over land — but FOLDED
        // like paper, a creased dog-eared corner. real scene, impossible object.
        const sw = bw * (0.42 + r() * 0.16), sh = bh * (0.42 + r() * 0.16);
        const ox = cx - sw / 2, oy = cy - sh / 2;
        const sunFx = 0.45 + r() * 0.4, sunFy = 0.36 + r() * 0.18;
        const foldFrac = 0.24 + r() * 0.20;             // dog-ear size varies
        // sky band
        const sk = x.createLinearGradient(0, oy, 0, oy + sh);
        sk.addColorStop(0, K.mix(pal.glow, pal.glass, 0.3));
        sk.addColorStop(0.45, K.mix(pal.glow, pal.spec, 0.4));
        sk.addColorStop(0.55, K.mix(pal.glass, pal.spec, 0.5));
        sk.addColorStop(1, K.mix(pal.felt, pal.shade, 0.3));
        x.fillStyle = sk; x.fillRect(ox, oy, sw, sh);
        // tiny sun on the horizon
        x.fillStyle = K.rgba(pal.glow, 0.85);
        x.beginPath(); x.arc(ox + sw * sunFx, oy + sh * sunFy, sw * 0.06, 0, 7); x.fill();
        // the FOLD: a dog-eared peeled corner showing the paper back
        x.fillStyle = K.mix(pal.paper, pal.shade, 0.15);
        x.beginPath();
        x.moveTo(ox + sw, oy + sh);
        x.lineTo(ox + sw - sw * foldFrac, oy + sh);
        x.lineTo(ox + sw, oy + sh - sh * foldFrac);
        x.closePath(); x.fill();
        // crease shadow
        x.strokeStyle = K.rgba(pal.shade, 0.4); x.lineWidth = Math.max(1, sw * 0.01);
        x.beginPath(); x.moveTo(ox + sw - sw * foldFrac, oy + sh); x.lineTo(ox + sw, oy + sh - sh * foldFrac); x.stroke();
        // a horizontal crease across the middle (the fold)
        x.strokeStyle = K.rgba(pal.shade, 0.28);
        x.beginPath(); x.moveTo(ox, oy + sh * 0.5); x.lineTo(ox + sw, oy + sh * 0.5); x.stroke();
        x.strokeStyle = K.rgba(pal.glow, 0.18);
        x.beginPath(); x.moveTo(ox, oy + sh * 0.5 - 2); x.lineTo(ox + sw, oy + sh * 0.5 - 2); x.stroke();
        // thin frame
        x.strokeStyle = K.rgba(pal.ink, 0.3); x.lineWidth = 1; x.strokeRect(ox, oy, sw, sh);

      } else if (kind === 'Bottled Cloud' || kind === 'Caught Wind') {
        // a glass bottle with a cork, holding a small live cloud / wind.
        const bw2 = rad * 0.95, bh2 = rad * 2.1;
        const ox = cx, oy = cy + rad * 0.75;
        // reusable bottle silhouette path
        const bottlePath = () => {
          x.beginPath();
          x.moveTo(ox - bw2 * 0.32, oy - bh2);
          x.lineTo(ox + bw2 * 0.32, oy - bh2);
          x.lineTo(ox + bw2 * 0.32, oy - bh2 * 0.78);
          x.quadraticCurveTo(ox + bw2 * 0.62, oy - bh2 * 0.62, ox + bw2 * 0.62, oy - bh2 * 0.42);
          x.lineTo(ox + bw2 * 0.62, oy - bh2 * 0.08);
          x.quadraticCurveTo(ox + bw2 * 0.62, oy, ox + bw2 * 0.42, oy);
          x.lineTo(ox - bw2 * 0.42, oy);
          x.quadraticCurveTo(ox - bw2 * 0.62, oy, ox - bw2 * 0.62, oy - bh2 * 0.08);
          x.lineTo(ox - bw2 * 0.62, oy - bh2 * 0.42);
          x.quadraticCurveTo(ox - bw2 * 0.62, oy - bh2 * 0.62, ox - bw2 * 0.32, oy - bh2 * 0.78);
          x.closePath();
        };
        // contact shadow on the felt under the bottle
        K.softShadow(x, ox, oy + rad * 0.1, bw2 * 1.5, 0.45);
        // glass body fill (clipped)
        x.save();
        bottlePath(); x.clip();
        const gf = x.createLinearGradient(ox - bw2 * 0.6, 0, ox + bw2 * 0.6, 0);
        gf.addColorStop(0, K.rgba(K.mix(pal.glass, pal.shade, 0.2), 0.55));
        gf.addColorStop(0.5, K.rgba(pal.glass, 0.32));
        gf.addColorStop(1, K.rgba(K.mix(pal.glass, pal.shade, 0.35), 0.6));
        x.fillStyle = gf; x.fillRect(ox - bw2, oy - bh2, bw2 * 2, bh2 + 4);
        // the cloud inside — denser, brighter core, sits in the belly
        const clCol = kind === 'Caught Wind' ? K.mix(pal.spec, pal.glow, 0.5) : K.mix('#ffffff', pal.glow, 0.5);
        const ccx = ox, ccy = oy - bh2 * 0.34;
        for (let i = 0; i < 200; i++) {
          const a = r() * 6.283, rr = Math.pow(r(), 0.6) * bw2 * 0.62;
          const px = ccx + Math.cos(a) * rr, py = ccy + Math.sin(a) * rr * 1.15;
          const n = (noise.fbm(px / 30, py / 30, 4) + 1) / 2;
          x.fillStyle = K.rgba(clCol, 0.05 + n * 0.16);
          x.beginPath(); x.arc(px, py, bw2 * (0.08 + n * 0.16), 0, 7); x.fill();
        }
        // bright cloud highlight cap
        K.bloom(x, ccx, ccy - bh2 * 0.06, bw2 * 0.9, clCol, 0.3);
        if (kind === 'Caught Wind') {
          x.strokeStyle = K.rgba(pal.glow, 0.4); x.lineWidth = Math.max(1.2, bw2 * 0.04); x.lineCap = 'round';
          for (let i = 0; i < 5; i++) {
            x.beginPath();
            let pxs = ox - bw2 * 0.4 + r() * bw2 * 0.8, pys = oy - bh2 * 0.55 + r() * bh2 * 0.35;
            x.moveTo(pxs, pys);
            for (let t = 0; t < 7; t++) { const c = K.curl(noise, pxs, pys); pxs += c[0] * 34; pys += c[1] * 34; x.lineTo(pxs, pys); }
            x.stroke();
          }
        }
        // vertical glass highlight streak
        x.fillStyle = K.rgba(pal.glow, 0.22);
        x.fillRect(ox - bw2 * 0.42, oy - bh2 * 0.66, bw2 * 0.08, bh2 * 0.55);
        x.restore();
        // bottle rim outline (drawn AFTER restore so it's crisp)
        bottlePath();
        x.strokeStyle = K.rgba(K.mix(pal.glass, pal.glow, 0.45), 0.7); x.lineWidth = Math.max(1.5, bw2 * 0.04);
        x.stroke();
        // cork stopper at the neck
        x.fillStyle = K.mix(pal.brass, pal.shade, 0.18);
        x.fillRect(ox - bw2 * 0.36, oy - bh2 - rad * 0.2, bw2 * 0.72, rad * 0.24);
        x.fillStyle = K.mix(pal.brass, pal.glow, 0.32);
        x.fillRect(ox - bw2 * 0.36, oy - bh2 - rad * 0.2, bw2 * 0.72, rad * 0.07);

      } else if (kind === 'Knotted Shadow') {
        // a shadow tied into an overhand knot — a dark sculptural ribbon, with
        // the flat shadow it SHOULD have cast pooling beneath it.
        const R = rad * (0.9 + r() * 0.35);
        const ka = specRot * 2.4;                        // knot rotation
        const kca = Math.cos(ka), ksa = Math.sin(ka);
        const sqz = 0.78 + r() * 0.18;                   // vertical squash varies
        // sample a trefoil-style knot curve, with depth (z) so we can draw it
        // back-to-front and break it at crossings → reads as an over/under knot.
        const pts = [];
        const N = 240;
        for (let i = 0; i <= N; i++) {
          const t = (i / N) * Math.PI * 2;
          let px = R * (Math.sin(t) + 2 * Math.sin(2 * t)) * 0.32;
          let py = R * (Math.cos(t) - 2 * Math.cos(2 * t)) * 0.32 * sqz;
          const rx = px * kca - py * ksa, ry = px * ksa + py * kca;
          const z = Math.sin(3 * t); // depth for sorting
          pts.push([cx + rx, cy + ry, z]);
        }
        // flat cast shadow on the felt beneath the knot (it's still a shadow)
        x.save();
        x.globalCompositeOperation = 'multiply';
        x.fillStyle = K.rgba(pal.shade, 0.32);
        x.beginPath(); x.ellipse(cx, by + bh * 0.82, R * 1.0, R * 0.26, 0, 0, 7); x.fill();
        x.restore();
        // draw the rope as overlapping segments, far (low z) first.
        const order = pts.map((p, i) => i).slice(0, N).sort((a, b) => pts[a][2] - pts[b][2]);
        x.lineCap = 'round'; x.lineJoin = 'round';
        const rope = R * 0.34;
        for (const i of order) {
          const a = pts[i], b = pts[i + 1];
          // soft self-shadow halo under each segment
          x.strokeStyle = K.rgba(pal.shade, 0.5); x.lineWidth = rope * 1.25;
          x.beginPath(); x.moveTo(a[0] + rope * 0.18, a[1] + rope * 0.18); x.lineTo(b[0] + rope * 0.18, b[1] + rope * 0.18); x.stroke();
          // rope body — dark, shaded by depth, with a faint top sheen
          const sh = 0.5 + (a[2] + 1) * 0.22;
          x.strokeStyle = K.rgba(K.mix(pal.shade, pal.spec, sh * 0.25), 0.95); x.lineWidth = rope;
          x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
          x.strokeStyle = K.rgba(K.mix(pal.spec, pal.glow, 0.3), 0.18 * sh); x.lineWidth = rope * 0.3;
          x.beginPath(); x.moveTo(a[0] - rope * 0.12, a[1] - rope * 0.12); x.lineTo(b[0] - rope * 0.12, b[1] - rope * 0.12); x.stroke();
        }

      } else if (kind === 'Pinned Beam') {
        // a beam/shaft of light, solid enough to be PINNED like a butterfly:
        // a luminous bar lying on a darkened patch, two insect pins crossing it.
        const ang = (r() - 0.5) * 0.4;
        const bl = rad * 2.6, bw3 = rad * 0.30;
        x.save();
        x.translate(cx, cy); x.rotate(ang);
        // darken the felt directly behind the beam so the light reads
        x.save(); x.globalCompositeOperation = 'multiply';
        const dk = x.createRadialGradient(0, 0, 0, 0, 0, bl * 0.7);
        dk.addColorStop(0, K.rgba(pal.shade, 0.6)); dk.addColorStop(1, K.rgba(pal.shade, 0));
        x.fillStyle = dk; x.fillRect(-bl, -bl * 0.5, bl * 2, bl); x.restore();
        // the beam glow halo
        K.bloom(x, 0, 0, bl * 0.6, pal.glow, 0.55);
        // beam body — bright core, soft feathered edges
        const bg2 = x.createLinearGradient(0, -bw3 * 1.6, 0, bw3 * 1.6);
        bg2.addColorStop(0, K.rgba(pal.glow, 0.0));
        bg2.addColorStop(0.35, K.rgba(pal.glow, 0.5));
        bg2.addColorStop(0.5, K.rgba('#ffffff', 0.98));
        bg2.addColorStop(0.65, K.rgba(pal.glow, 0.5));
        bg2.addColorStop(1, K.rgba(pal.glow, 0.0));
        x.fillStyle = bg2; x.fillRect(-bl / 2, -bw3 * 1.6, bl, bw3 * 3.2);
        // feathered ends
        const ends = x.createLinearGradient(-bl / 2, 0, bl / 2, 0);
        ends.addColorStop(0, K.rgba(pal.shade, 0.0));
        ends.addColorStop(0.08, K.rgba('#ffffff', 0));
        ends.addColorStop(0.5, K.rgba('#ffffff', 0));
        ends.addColorStop(0.92, K.rgba('#ffffff', 0));
        ends.addColorStop(1, K.rgba(pal.shade, 0.0));
        // bright center filament
        x.fillStyle = K.rgba('#ffffff', 0.95); x.fillRect(-bl / 2, -bw3 * 0.1, bl, bw3 * 0.2);
        x.restore();
        // two brass pins crossing OVER the beam, with little cast shadows
        [-rad * 0.85, rad * 0.85].forEach((dx) => {
          const px = cx + Math.cos(ang) * dx, py = cy + Math.sin(ang) * dx;
          const pinTop = rad * 0.85;
          // shadow
          x.strokeStyle = K.rgba(pal.shade, 0.4); x.lineWidth = Math.max(1.5, rad * 0.05);
          x.beginPath(); x.moveTo(px + 3, py - pinTop + 3); x.lineTo(px + 3, py + rad * 0.55 + 3); x.stroke();
          // pin shaft
          x.strokeStyle = K.mix(pal.brass, pal.shade, 0.05); x.lineWidth = Math.max(1.5, rad * 0.045);
          x.beginPath(); x.moveTo(px, py - pinTop); x.lineTo(px, py + rad * 0.55); x.stroke();
          // glint
          x.strokeStyle = K.rgba(pal.glow, 0.6); x.lineWidth = Math.max(1, rad * 0.015);
          x.beginPath(); x.moveTo(px - rad * 0.012, py - pinTop); x.lineTo(px - rad * 0.012, py + rad * 0.4); x.stroke();
          // head
          x.fillStyle = K.mix(pal.brass, pal.glow, 0.5);
          x.beginPath(); x.arc(px, py - pinTop, rad * 0.11, 0, 7); x.fill();
          x.fillStyle = K.rgba(pal.glow, 0.8);
          x.beginPath(); x.arc(px - rad * 0.03, py - pinTop - rad * 0.03, rad * 0.04, 0, 7); x.fill();
        });

      } else if (kind === 'A Tiny Sea') {
        // a small ocean horizon contained low in the chamber — waves, a far
        // ship, sky above. (used mostly by Liquid Jar; also standalone.)
        const ix = bx + bw * 0.1, iw = bw * 0.8;       // sea inset
        const iTop = by + bh * 0.12, iBot = by + bh * 0.88;
        const seaY = by + bh * (0.50 + r() * 0.06);
        // sky — warm institutional dawn, NOT bright
        const sk = x.createLinearGradient(0, iTop, 0, seaY);
        sk.addColorStop(0, K.mix(pal.glass, pal.shade, 0.25));
        sk.addColorStop(0.7, K.mix(pal.glow, pal.glass, 0.55));
        sk.addColorStop(1, K.mix(pal.glow, pal.spec, 0.5));
        x.fillStyle = sk; x.fillRect(ix, iTop, iw, seaY - iTop);
        // low sun on the horizon + reflection
        x.fillStyle = K.rgba(pal.glow, 0.9);
        const sunX2 = ix + iw * (0.35 + r() * 0.3);
        x.beginPath(); x.arc(sunX2, seaY - bw * 0.04, bw * 0.055, 0, 7); x.fill();
        K.bloom(x, sunX2, seaY - bw * 0.04, bw * 0.2, pal.glow, 0.4);
        // sea — deep, with luminous near-horizon band
        const sea = x.createLinearGradient(0, seaY, 0, iBot);
        sea.addColorStop(0, K.mix(pal.glow, pal.glass, 0.4));
        sea.addColorStop(0.18, K.mix(pal.glass, '#ffffff', 0.15));
        sea.addColorStop(1, K.mix(pal.glass, pal.shade, 0.62));
        x.fillStyle = sea; x.fillRect(ix, seaY, iw, iBot - seaY);
        // sun glitter column on the water
        x.fillStyle = K.rgba(pal.glow, 0.28);
        x.fillRect(sunX2 - bw * 0.03, seaY, bw * 0.06, iBot - seaY);
        // wave lines
        x.strokeStyle = K.rgba(pal.glow, 0.28); x.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const wy = seaY + (iBot - seaY) * (i / 7);
          x.beginPath();
          for (let px = ix; px < ix + iw; px += 6) {
            const yy = wy + Math.sin(px / 14 + i) * (1.5 + i * 0.8);
            if (px === ix) x.moveTo(px, yy); else x.lineTo(px, yy);
          }
          x.stroke();
        }
        // tiny ship silhouette
        x.fillStyle = K.rgba(pal.ink, 0.7);
        const shx = ix + iw * (0.55 + r() * 0.2);
        x.fillRect(shx, seaY - bw * 0.024, bw * 0.045, bw * 0.016);
        x.fillRect(shx + bw * 0.018, seaY - bw * 0.05, bw * 0.005, bw * 0.032);

      } else if (kind === 'Square Moon') {
        // a small square moon hanging in a night chamber — real but wrong shape
        const mr = rad * 0.9;
        K.bloom(x, cx, cy, mr * 2.4, pal.glow, 0.3);
        x.fillStyle = K.mix(pal.glow, pal.spec, 0.3);
        x.save(); x.translate(cx, cy); x.rotate((r() - 0.5) * 0.3);
        // rounded square
        const rr = mr * 0.18;
        x.beginPath();
        x.moveTo(-mr + rr, -mr); x.lineTo(mr - rr, -mr); x.quadraticCurveTo(mr, -mr, mr, -mr + rr);
        x.lineTo(mr, mr - rr); x.quadraticCurveTo(mr, mr, mr - rr, mr);
        x.lineTo(-mr + rr, mr); x.quadraticCurveTo(-mr, mr, -mr, mr - rr);
        x.lineTo(-mr, -mr + rr); x.quadraticCurveTo(-mr, -mr, -mr + rr, -mr);
        x.closePath(); x.fill();
        // craters
        for (let i = 0; i < 5; i++) {
          x.fillStyle = K.rgba(pal.shade, 0.18);
          x.beginPath(); x.arc((r() - 0.5) * mr * 1.4, (r() - 0.5) * mr * 1.4, mr * (0.08 + r() * 0.12), 0, 7); x.fill();
        }
        x.restore();
      }
      x.restore();
    }

    // pick the specimen kind for this seed (Liquid Jar forces 'A Tiny Sea')
    let kind = specName;
    if (mode === 'Liquid Jar') kind = 'A Tiny Sea';

    // ─────────────────────────────────────────────────────────────
    // COMPOSE PER MODE
    // ─────────────────────────────────────────────────────────────

    if (mode === 'Bell Jar') {
      // a glass dome on a turned wooden base, one specimen beneath.
      const baseW = W * rng(0.34, 0.52) * Math.sqrt(heroScale), baseH = S * rng(0.045, 0.075);
      const baseX = heroCX - baseW / 2, baseY = floorY - baseH;
      // wooden plinth base
      x.fillStyle = K.mix(pal.brass, pal.shade, 0.35);
      x.fillRect(baseX, baseY, baseW, baseH);
      x.fillStyle = K.mix(pal.brass, pal.glow, 0.2);
      x.fillRect(baseX, baseY, baseW, baseH * 0.22);
      x.fillStyle = K.rgba(pal.shade, 0.5);
      x.fillRect(baseX - baseW * 0.03, baseY + baseH * 0.7, baseW * 1.06, baseH * 0.3);
      // cast shadow of dome on floor
      const domeCX = heroCX;
      K.softShadow(x, domeCX, floorY + S * 0.02, baseW * 0.8, 0.5);
      // the dome interior (felt mound + specimen) — proportions vary per output
      const domeW = baseW * rng(0.78, 0.94), domeH = S * rng(0.40, 0.58) * heroScale;
      const domeX = domeCX - domeW / 2, domeY = baseY - domeH;
      // felt mound inside
      x.save();
      x.beginPath();
      x.moveTo(domeX, baseY);
      x.lineTo(domeX, domeY + domeH * 0.4);
      x.quadraticCurveTo(domeX, domeY, domeCX, domeY);
      x.quadraticCurveTo(domeX + domeW, domeY, domeX + domeW, domeY + domeH * 0.4);
      x.lineTo(domeX + domeW, baseY);
      x.closePath();
      x.clip();
      // interior backdrop
      const ig = x.createLinearGradient(0, domeY, 0, baseY);
      ig.addColorStop(0, K.mix(pal.felt, pal.glow, 0.18));
      ig.addColorStop(1, K.mix(pal.felt, pal.shade, 0.3));
      x.fillStyle = ig; x.fillRect(domeX, domeY, domeW, domeH);
      K.bloom(x, domeCX, domeY + domeH * 0.2, domeH, pal.glow, 0.16);
      paintSpecimen(domeX, domeY, domeW, domeH, kind, 0.95);
      x.restore();
      // GLASS dome over it
      x.save();
      x.beginPath();
      x.moveTo(domeX, baseY);
      x.lineTo(domeX, domeY + domeH * 0.4);
      x.quadraticCurveTo(domeX, domeY, domeCX, domeY);
      x.quadraticCurveTo(domeX + domeW, domeY, domeX + domeW, domeY + domeH * 0.4);
      x.lineTo(domeX + domeW, baseY);
      x.closePath();
      x.fillStyle = K.rgba(pal.glass, 0.14); x.fill();
      // sheen on dome
      x.globalCompositeOperation = 'screen';
      const dref = x.createLinearGradient(domeX, domeY, domeX + domeW * 0.6, baseY);
      dref.addColorStop(0, K.rgba(pal.glow, 0.22));
      dref.addColorStop(0.3, K.rgba(pal.glow, 0.04));
      dref.addColorStop(1, K.rgba(pal.glow, 0.0));
      x.fillStyle = dref; x.fill();
      x.restore();
      // brass finial knob on top
      x.fillStyle = K.mix(pal.brass, pal.glow, 0.3);
      x.beginPath(); x.arc(domeCX, domeY - S * 0.012, S * 0.018, 0, 7); x.fill();
      // label card leaning at the base — its own offset & tilt
      labelCard(domeCX + jit(W * 0.12), floorY + (H - floorY) * rng(0.30, 0.55), W * rng(0.16, 0.24), S * rng(0.085, 0.115), jit(0.24), kind);

    } else if (mode === 'Case Grid') {
      // a long display case with several small specimens in a row.
      const caseW = W * rng(0.66, 0.90), caseH = S * rng(0.32, 0.46);
      const caseCX = W * 0.5 + jit(W * 0.07);
      const caseX = caseCX - caseW / 2, caseY = floorY - caseH - S * rng(0.02, 0.10);
      K.softShadow(x, caseCX, floorY + S * 0.01, caseW * 0.6, 0.45);
      brassEdge(caseX, caseY, caseW, caseH, Math.max(4, S * 0.012));
      const n = 3 + (r() * 3 | 0);                       // 3..5 cells, not fixed
      const pad = caseW * 0.02;
      const cellW = (caseW - pad * (n + 1)) / n;
      const sames = K.shuffle(SPECIMENS, r);
      for (let i = 0; i < n; i++) {
        const cxp = caseX + pad + i * (cellW + pad);
        // mullion shadow between cells
        glassChamber(cxp, caseY, cellW, caseH, (bx, by, bw, bh) => {
          paintSpecimen(bx, by, bw, bh * 0.86, sames[i % sames.length], 1.0);
        });
        // tiny label under each
        labelCard(cxp + cellW / 2, caseY + caseH - caseH * 0.12, cellW * 0.7, caseH * 0.13, 0, '');
      }
      // brass mullions (vertical dividers) drawn over the glass
      for (let i = 1; i < n; i++) {
        const mx = caseX + pad + i * (cellW + pad) - pad / 2;
        x.fillStyle = K.mix(pal.brass, pal.shade, 0.2); x.fillRect(mx - S * 0.004, caseY, S * 0.008, caseH);
        x.fillStyle = K.mix(pal.brass, pal.glow, 0.3); x.fillRect(mx - S * 0.004, caseY, S * 0.003, caseH);
      }
      // big plinth label below the case
      labelCard(caseCX + jit(W * 0.06), floorY + (H - floorY) * rng(0.30, 0.50), W * rng(0.26, 0.40), S * rng(0.07, 0.10), jit(0.05), 'CASE');

    } else if (mode === 'Pinned Board') {
      // an entomology-style pinned board: a felt/cork panel, the specimen
      // pinned with brass pins, hand-written labels around it.
      const boardW = W * rng(0.58, 0.78), boardH = S * rng(0.50, 0.70);
      const boardCX = W * 0.5 + jit(W * 0.08), boardCY = H * (0.50 + jit(0.06));
      const boardX = boardCX - boardW / 2, boardY = boardCY - boardH / 2;
      K.softShadow(x, boardCX, boardY + boardH * 0.5, boardW * 0.7, 0.4);
      brassEdge(boardX, boardY, boardW, boardH, Math.max(4, S * 0.014));
      // cork/felt panel
      const cg = x.createLinearGradient(0, boardY, 0, boardY + boardH);
      cg.addColorStop(0, K.mix(pal.felt, pal.glow, 0.2));
      cg.addColorStop(1, K.mix(pal.felt, pal.shade, 0.4));
      x.fillStyle = cg; x.fillRect(boardX, boardY, boardW, boardH);
      K.mottle(x, boardX, boardY, boardW, boardH, pal.felt, 16, r, 'overlay');
      // the specimen pinned center — large, dominating the cork (scale varies)
      paintSpecimen(boardX, boardY, boardW, boardH, kind === 'A Tiny Sea' ? 'Pinned Beam' : kind, rng(1.15, 1.55));
      // brass pins at corners of an implied mount — jittered inward/outward
      const pj = () => (r() - 0.5) * 0.08;
      [[0.32 + pj(), 0.28 + pj()], [0.68 + pj(), 0.28 + pj()], [0.32 + pj(), 0.72 + pj()], [0.68 + pj(), 0.72 + pj()]].forEach((p) => {
        const px = boardX + boardW * p[0], py = boardY + boardH * p[1];
        K.softShadow(x, px + 3, py + 3, S * 0.02, 0.4);
        x.fillStyle = K.mix(pal.brass, pal.glow, 0.5);
        x.beginPath(); x.arc(px, py, S * 0.011, 0, 7); x.fill();
        x.fillStyle = K.rgba(pal.glow, 0.7);
        x.beginPath(); x.arc(px - S * 0.003, py - S * 0.003, S * 0.004, 0, 7); x.fill();
      });
      // small handwritten label slips pinned at varied spots & angles (1-3)
      const slips = 1 + (r() * 3 | 0);
      for (let s = 0; s < slips; s++) {
        labelCard(boardX + boardW * rng(0.14, 0.82), boardY + boardH * rng(0.10, 0.90), boardW * rng(0.22, 0.34), boardH * rng(0.10, 0.16), jit(0.18), '');
      }

    } else if (mode === 'Single Pedestal') {
      // one pedestal, a single glass cube on top, lone specimen. Cube reads big.
      const pedCX = W * 0.5 + jit(W * 0.14);
      const pedW = W * rng(0.20, 0.32), pedH = floorY - H * rng(0.40, 0.54);
      const pedX = pedCX - pedW / 2, pedY = floorY - pedH;
      K.softShadow(x, pedCX, floorY + S * 0.015, pedW * 1.3, 0.5);
      // pedestal column (lit left, shaded right)
      const pg = x.createLinearGradient(pedX, 0, pedX + pedW, 0);
      pg.addColorStop(0, K.mix(pal.paper, pal.glow, 0.12));
      pg.addColorStop(0.5, K.mix(pal.paper, pal.shade, 0.12));
      pg.addColorStop(1, K.mix(pal.paper, pal.shade, 0.42));
      x.fillStyle = pg; x.fillRect(pedX, pedY, pedW, pedH);
      // pedestal cap + base mouldings
      x.fillStyle = K.mix(pal.paper, pal.glow, 0.1); x.fillRect(pedX - pedW * 0.08, pedY, pedW * 1.16, pedH * 0.04);
      x.fillStyle = K.mix(pal.paper, pal.shade, 0.3); x.fillRect(pedX - pedW * 0.08, floorY - pedH * 0.05, pedW * 1.16, pedH * 0.05);
      K.mottle(x, pedX, pedY, pedW, pedH, pal.paper, 26, r, 'multiply');
      // glass cube on top — larger than the pedestal width, the hero
      const cubeS = pedW * rng(1.3, 1.8), cubeAsp = rng(0.85, 1.18), cubeH = cubeS * cubeAsp;
      const cubeY = pedY - cubeH;
      const cubeX = pedCX - cubeS / 2 + jit(pedW * 0.10);
      glassChamber(cubeX, cubeY, cubeS, cubeH, (bx, by, bw, bh) => {
        paintSpecimen(bx, by, bw, bh, kind, rng(1.05, 1.45));
      });
      brassEdge(cubeX, cubeY, cubeS, cubeH, Math.max(3, S * 0.008));
      // a numbered label plaque on the pedestal face
      labelCard(pedCX + jit(pedW * 0.12), pedY + pedH * rng(0.30, 0.50), pedW * rng(0.6, 0.8), pedH * rng(0.12, 0.16), jit(0.04), kind);

    } else if (mode === 'Liquid Jar') {
      // a wide-mouth specimen jar of clear fluid with a tiny sea inside it,
      // a brass clamp lid, fluid line + refraction offset.
      const jarCX = W * 0.5 + jit(W * 0.12);
      const jarW = W * rng(0.34, 0.50) * Math.sqrt(heroScale), jarH = S * rng(0.50, 0.68) * heroScale;
      const jarX = jarCX - jarW / 2, jarY = floorY - jarH;
      K.softShadow(x, jarCX, floorY + S * 0.015, jarW * 0.8, 0.5);
      x.save();
      // jar body rounded rect — corner radius varies the silhouette
      const rr = jarW * rng(0.08, 0.20);
      x.beginPath();
      x.moveTo(jarX + rr, jarY); x.lineTo(jarX + jarW - rr, jarY);
      x.quadraticCurveTo(jarX + jarW, jarY, jarX + jarW, jarY + rr);
      x.lineTo(jarX + jarW, jarY + jarH - rr);
      x.quadraticCurveTo(jarX + jarW, jarY + jarH, jarX + jarW - rr, jarY + jarH);
      x.lineTo(jarX + rr, jarY + jarH);
      x.quadraticCurveTo(jarX, jarY + jarH, jarX, jarY + jarH - rr);
      x.lineTo(jarX, jarY + rr); x.quadraticCurveTo(jarX, jarY, jarX + rr, jarY);
      x.closePath();
      x.clip();
      // fluid fill backdrop — fill line varies (how full the jar is)
      const flY = jarY + jarH * rng(0.10, 0.24);
      x.fillStyle = K.mix(pal.shade, pal.glass, 0.3); x.fillRect(jarX, jarY, jarW, jarH);
      // the tiny sea inside the fluid region
      paintSpecimen(jarX, flY, jarW, jarH - (flY - jarY), 'A Tiny Sea', 1.0);
      // fluid tint + meniscus
      x.fillStyle = K.rgba(pal.glass, 0.22); x.fillRect(jarX, flY, jarW, jarH - (flY - jarY));
      x.fillStyle = K.rgba(pal.glow, 0.25); x.fillRect(jarX, flY - jarH * 0.01, jarW, jarH * 0.012);
      // refraction band — a faint horizontal shift highlight
      x.fillStyle = K.rgba(pal.glow, 0.08); x.fillRect(jarX, flY + jarH * 0.3, jarW, jarH * 0.06);
      x.restore();
      // jar glass tint over whole + sheen
      x.save();
      x.fillStyle = K.rgba(pal.glass, 0.10); x.fillRect(jarX, jarY, jarW, jarH);
      x.globalCompositeOperation = 'screen';
      x.fillStyle = K.rgba(pal.glow, 0.16); x.fillRect(jarX + jarW * 0.1, jarY + jarH * 0.05, jarW * 0.08, jarH * 0.85);
      x.restore();
      // brass clamp lid
      x.fillStyle = K.mix(pal.brass, pal.shade, 0.15);
      x.fillRect(jarX - jarW * 0.04, jarY - S * 0.04, jarW * 1.08, S * 0.05);
      x.fillStyle = K.mix(pal.brass, pal.glow, 0.35);
      x.fillRect(jarX - jarW * 0.04, jarY - S * 0.04, jarW * 1.08, S * 0.014);
      // glass outline
      x.strokeStyle = K.rgba(K.mix(pal.glass, pal.glow, 0.3), 0.4); x.lineWidth = Math.max(1.5, jarW * 0.012);
      x.strokeRect(jarX, jarY, jarW, jarH);
      // label band on the jar — height & exact band vary
      labelCard(jarCX + jit(jarW * 0.08), jarY + jarH * rng(0.66, 0.82), jarW * rng(0.62, 0.78), jarH * rng(0.13, 0.18), jit(0.03), 'SEA');

    } else { // Label Study
      // a big foxed catalogue plate: an inset specimen DIAGRAM up top, a typed
      // catalogue block below. The plate IS the subject — a scholarly figure.
      const cardW = W * rng(0.56, 0.74), cardH = S * rng(0.66, 0.84);
      const cardX = W * 0.5 + jit(W * 0.10);
      const cardY = H * (0.46 + jit(0.05));
      const rot = jit(0.05);
      x.save();
      x.translate(cardX, cardY); x.rotate(rot);
      const L = -cardW / 2, T = -cardH / 2;
      // card shadow
      K.softShadow(x, cardH * 0.04, cardH * 0.06, cardW * 0.7, 0.42);
      // paper
      const pg = x.createLinearGradient(0, T, 0, T + cardH);
      pg.addColorStop(0, K.mix(pal.paper, pal.glow, 0.14));
      pg.addColorStop(1, K.mix(pal.paper, pal.shade, 0.2));
      x.fillStyle = pg; x.fillRect(L, T, cardW, cardH);
      K.mottle(x, L, T, cardW, cardH, pal.paper, 22, r, 'multiply');
      // a thin printed border rule inset from the edge
      x.strokeStyle = K.rgba(pal.ink, 0.4); x.lineWidth = Math.max(1, cardW * 0.004);
      x.strokeRect(L + cardW * 0.05, T + cardH * 0.05, cardW * 0.9, cardH * 0.9);
      // FIGURE: framed specimen diagram — size & top position vary
      const figW = cardW * rng(0.66, 0.84), figH = cardH * rng(0.38, 0.52);
      const figX = L + cardW * 0.5 - figW / 2 + jit(cardW * 0.05), figY = T + cardH * rng(0.07, 0.14);
      x.fillStyle = K.mix(pal.felt, pal.shade, 0.25); x.fillRect(figX, figY, figW, figH);
      paintSpecimen(figX, figY, figW, figH, kind === 'A Tiny Sea' ? kind : kind, 1.0);
      // a glassy plate sheen over the figure
      x.save(); x.globalCompositeOperation = 'screen';
      x.fillStyle = K.rgba(pal.glow, 0.06); x.fillRect(figX, figY, figW * 0.5, figH); x.restore();
      x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = Math.max(1, cardW * 0.003);
      x.strokeRect(figX, figY, figW, figH);
      // "Fig. 1" caption + title rule under the figure
      x.fillStyle = K.rgba(pal.ink, 0.7);
      x.fillRect(figX, figY + figH + cardH * 0.03, figW * 0.46, cardH * 0.018);
      x.strokeStyle = K.rgba(pal.ink, 0.55); x.lineWidth = Math.max(1, cardH * 0.004);
      x.beginPath(); x.moveTo(figX, figY + figH + cardH * 0.075); x.lineTo(figX + figW, figY + figH + cardH * 0.075); x.stroke();
      // typed catalogue rows (dense, two-column feel)
      const rowY0 = figY + figH + cardH * 0.1, rowH = cardH * 0.022, rowGap = cardH * 0.038;
      const nRows = 5;
      for (let i = 0; i < nRows; i++) {
        const yy = rowY0 + i * rowGap;
        x.fillStyle = K.rgba(pal.ink, 0.6);
        x.fillRect(figX, yy, figW * (0.55 + r() * 0.4), rowH);
        if (r() < 0.6) { x.fillStyle = K.rgba(pal.ink, 0.5); x.fillRect(figX + figW * 0.66, yy, figW * 0.28 * (0.5 + r() * 0.5), rowH); }
      }
      // wax/brass catalogue stamp in lower corner (clear of text)
      x.fillStyle = K.rgba(K.mix(pal.brass, pal.shade, 0.1), 0.92);
      x.beginPath(); x.arc(L + cardW * 0.82, T + cardH * 0.86, cardW * 0.055, 0, 7); x.fill();
      x.fillStyle = K.rgba(pal.glow, 0.22);
      x.beginPath(); x.arc(L + cardW * 0.8, T + cardH * 0.84, cardW * 0.018, 0, 7); x.fill();
      x.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // GLOBAL ATMOSPHERE & TEXTURE GRADE
    // ─────────────────────────────────────────────────────────────
    // warm dusty haze tuned to the palette (drifts over everything)
    const hazeCol = K.mix(pal.glow, pal.glass, 0.45);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.11, S * 0.85, 'screen');
    // a low warm dust pool near the floor
    const dust = x.createLinearGradient(0, floorY - H * 0.1, 0, H);
    dust.addColorStop(0, K.rgba(hazeCol, 0));
    dust.addColorStop(0.5, K.rgba(K.mix(hazeCol, pal.glow, 0.4), 0.12));
    dust.addColorStop(1, K.rgba(pal.shade, 0.18));
    x.fillStyle = dust; x.fillRect(0, floorY - H * 0.1, W, H - (floorY - H * 0.1));
    // faint floating dust motes caught in the gallery light (seeded scatter)
    x.save(); x.globalCompositeOperation = 'screen';
    for (let m = 0; m < motes; m++) {
      const mx = r() * W, my = H * (0.10 + r() * 0.75);
      const ms = S * (0.001 + r() * 0.004);
      x.fillStyle = K.rgba(hazeCol, 0.05 + r() * 0.10);
      x.beginPath(); x.arc(mx, my, ms, 0, 7); x.fill();
    }
    x.restore();
    // overall film grain
    K.grain(x, W, H, 5.5, r);
    // seat it — strong institutional vignette, focus point varies
    K.vignette(x, W, H, vigFoc);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    let specName = K.pick(SPECIMENS, r);
    if (mode === 'Liquid Jar') specName = 'A Tiny Sea';
    const f = fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Specimen: specName, Format: f };
  }

  return { name: 'h4_cabinet', draw, traits };
})();
