/* P_GLASS — molten / cut luminous glass with caustic refraction (abstract)
 *
 * Thick translucent COLORED glass that bends and pools light. A primary glass
 * mass sits off-centre on a thirds line; its thickness field (fbm-warped) acts
 * as a lens — the steeper the slope of the glass surface, the more it refracts,
 * so transmitted colour shifts toward the caustic hue and bright caustic bands
 * are thrown on a diagonal across the field. Where forms overlap their colours
 * MULTIPLY into new, deeper hues (real glass lensing). Crisp bright highlight
 * edges fire on the sharpest slopes (the cut/facet catch of light). The far
 * field opposite the mass is a calm shaped pool of the transmitted base.
 *
 * Engine of refraction, NOT stacked shapes:
 *   - thickness(u,v): fbm domain-warped height of the molten glass body.
 *   - transmitted colour = base tinted DEEPER with thickness (Beer–Lambert feel),
 *     pushed toward the caustic hue where the glass bends (slope), so the body
 *     reads translucent + lit-through, never a flat fill.
 *   - caustic bands: sin() of the warped phase, raised to a power → thin bright
 *     additive ribbons (the rippling cut-glass light), strongest on the diagonal.
 *   - secondary lens blobs MULTIPLY over the body for overlapping-glass mixing.
 *   - specular edge: bright glint where |∇thickness| is highest (the cut catch).
 *
 * Coarse grid for the field (fast, no per-pixel loops). One bounded chromaSplit
 * pass for refractive edge shimmer. Canvas long edge ≤ 1280.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── BESPOKE GLASS PALETTE SET ───────────────────────────────────────────────
  // Each is a single GLASS IDENTITY: a transmitted body colour (the colour you
  // see THROUGH the glass), a deeper pooled colour for thick troughs (Beer–
  // Lambert darkening — still saturated, never black), a CAUSTIC hue (the bright
  // refracted band colour, complementary so it reads as split light), a calm
  // field colour for the shaped negative pool, and a near-white glint for the
  // cut-edge specular. Designed FOR colored glass — saturated, anime-bright,
  // luminous, each a distinct world that mixes into new hues under multiply.
  //   body    — transmitted colour through thin glass (the lit body)
  //   deep    — pooled transmitted colour through THICK glass (saturated, not black)
  //   caustic — the bright refracted light-band hue (complementary split)
  //   field   — calm shaped negative pool (a quiet relative of body)
  //   glint   — cut-edge specular catch (near-white, faintly tinted)
  const PALS = [
    { name: 'Amber Caustic',   body: '#ffae2b', deep: '#c2530a', caustic: '#2af0ff', field: '#ffd98a', glint: '#fff6dc' },
    { name: 'Cobalt Gold',     body: '#2f6bff', deep: '#16216e', caustic: '#ffd23f', field: '#7ea6ff', glint: '#eaf2ff' },
    { name: 'Rose Teal',       body: '#ff5ea0', deep: '#a81f6e', caustic: '#3fffd0', field: '#ff9cc4', glint: '#ffe9f3' },
    { name: 'Emerald Magenta', body: '#1fd089', deep: '#076648', caustic: '#ff3df0', field: '#7af0c2', glint: '#e2fff0' },
    { name: 'Viridian Coral',  body: '#12c0c4', deep: '#075c70', caustic: '#ff8a4d', field: '#79e8ec', glint: '#dffaff' },
    { name: 'Violet Citrus',   body: '#9b4dff', deep: '#4a1a8e', caustic: '#caff39', field: '#c79cff', glint: '#f1e6ff' },
    { name: 'Tangerine Cobalt',body: '#ff7a2b', deep: '#b53e0c', caustic: '#3f8aff', field: '#ffb27a', glint: '#fff0dc' },
    { name: 'Aqua Ember',      body: '#2bd6ff', deep: '#0a5e8a', caustic: '#ff4f7a', field: '#9ceaff', glint: '#e6fbff' },
  ];

  // varied aspect — portrait / landscape / square (square the minority). ≤1280.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1024, H: 1536, t: 'Tall' },       // 2:3
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.48 ? FMTS[1] : x < 0.70 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  const STATE = ['Molten', 'Cut', 'Poured'];          // surface character of the glass
  const CAUST = ['Ribbon', 'Lattice', 'Scatter'];     // caustic band geometry
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','Caustic Supernova','Prism Split'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const state = K.pick(STATE, r);
    const caust = K.pick(CAUST, r);
    const event = K.pick(EVENTS, r);

    // diagonal of the refracted light energy (edge-to-edge)
    const ang = (r() < 0.5 ? -0.62 : 0.7) + (r() - 0.5) * 0.5;
    // glass body geometry
    const warp = 0.55 + r() * 0.65;                       // domain-warp strength
    const freq = state === 'Cut' ? 2.6 + r() * 1.4 : state === 'Poured' ? 1.1 + r() * 0.7 : 1.7 + r() * 0.9;
    const sharp = state === 'Cut' ? 2.6 : state === 'Poured' ? 1.0 : 1.5;  // facet hardness
    const thick = 0.85 + r() * 0.5;                       // overall glass thickness
    // caustic band character
    const causFreq = caust === 'Lattice' ? 9 + r() * 6 : caust === 'Scatter' ? 5 + r() * 4 : 6 + r() * 3;
    const causPow  = caust === 'Ribbon' ? 7 : caust === 'Lattice' ? 5 : 9;  // band tightness

    // focal mass on a thirds intersection — placed firmly off-centre, sized so the
    // opposite corner stays a calm breathing field (25–40% negative space).
    const fx = (r() < 0.5 ? 0.32 : 0.68) + (r() - 0.5) * 0.04;
    const fy = (r() < 0.5 ? 0.33 : 0.67) + (r() - 0.5) * 0.04;
    let fr = 0.27 + r() * 0.1;                            // primary mass radius (in u)
    if (fmt.t === 'Square') fr *= 0.82;                  // keep breathing space in squares

    // demoted secondary lens blobs (overlapping-glass multiply). Kept on the focal
    // side so they extend/counter the primary mass, never filling the calm field.
    const sideX = fx < 0.5 ? 1 : -1, sideY = fy < 0.5 ? 1 : -1;
    const nblob = K.rint(r, 2, 3);
    const blobs = [];
    for (let i = 0; i < nblob; i++) {
      blobs.push({
        x: K.clamp(fx + sideX * r() * 0.34 + (r() - 0.5) * 0.18, 0.08, 0.92),
        y: K.clamp(fy + sideY * r() * 0.34 + (r() - 0.5) * 0.18, 0.08, 0.92),
        r: 0.1 + r() * 0.13,
        hue: r(),              // mixes body↔caustic for the blob's transmitted tint
      });
    }
    return { pal, fmt, state, caust, event, ang, warp, freq, sharp, thick, causFreq, causPow, fx, fy, fr, blobs };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Glass: p.state, Caustic: p.caust, Event: p.event };
  }

  // ── thickness / height of the molten glass body at normalised (u,v) ──
  // domain-warped fbm pooled into an off-centre mass; 0 = no glass, 1 = thickest.
  function thickness(noise, u, v, p) {
    // domain warp for the molten flow
    const wx = noise.fbm(u * 1.3 + 3.1, v * 1.3 + 1.7, 4) * p.warp;
    const wy = noise.fbm(u * 1.3 + 7.4, v * 1.3 + 9.2, 4) * p.warp;
    const uu = u + wx * 0.35, vv = v + wy * 0.35;
    // radial pooling toward the focal mass (off-centre body)
    const dx = (uu - p.fx), dy = (vv - p.fy);
    const d = Math.sqrt(dx * dx + dy * dy);
    let mass = K.clamp(1 - d / p.fr, 0, 1);
    mass = mass * mass * (3 - 2 * mass);                 // smoothstep falloff
    // faceted / molten internal structure — kept SMOOTH at the macro scale so the
    // surface has a few real ridges rather than all-over micro-slope.
    let body = noise.fbm(uu * p.freq, vv * p.freq, 4) * 0.5 + 0.5;
    body = Math.pow(body, 1 / p.sharp);                  // sharpen for cut facets
    body += 0.15 * (noise.fbm(uu * p.freq * 2.0, vv * p.freq * 2.0, 3) * 0.5 + 0.5);
    let h = mass * (0.55 + 0.55 * body) * p.thick;
    // secondary blobs add their own pooling (overlap → thicker glass)
    for (const b of p.blobs) {
      const bdx = uu - b.x, bdy = vv - b.y, bd = Math.sqrt(bdx * bdx + bdy * bdy);
      let m = K.clamp(1 - bd / b.r, 0, 1); m = m * m * m * (3 - 2 * m);  // softer, no hard ring
      h += m * (0.32 + 0.34 * body) * p.thick;
    }
    return h;
  }

  // caustic intensity — thin bright ribbons from the warped phase along the diagonal
  function caustic(noise, u, v, p, slope) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.6 + 5.5, v * 1.6 + 2.2, 4) * 0.9;
    // phase bent by the local slope → bands crowd where glass refracts hard
    const ph = (ru + warp) * p.causFreq + slope * 2.2;
    let band = Math.abs(Math.sin(ph * Math.PI));
    band = Math.pow(band, p.causPow);                    // thin, bright ribbons
    // cross-hatch for the lattice flavour
    if (p.caust === 'Lattice') {
      const rv = u * s + v * c;
      const ph2 = (rv + warp * 0.7) * p.causFreq;
      band = Math.max(band, Math.pow(Math.abs(Math.sin(ph2 * Math.PI)), p.causPow));
    }
    return band;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // colour anchors
    const lit   = K.mix(P.body, P.glint, 0.14);          // thin glass — still clearly body hue
    const fieldDeep = K.mix(P.field, P.deep, 0.30);

    // ── 1. LUMINOUS GROUND — a calm transmitted-light field, brightest behind the
    //   mass so the glass reads BACK-LIT. Never a void. ──
    const fcx = p.fx * W, fcy = p.fy * H;
    const gg = x.createRadialGradient(fcx, fcy, 0, fcx, fcy, Math.max(W, H) * 0.95);
    gg.addColorStop(0, K.mix(P.field, P.glint, 0.34));
    gg.addColorStop(0.42, P.field);
    gg.addColorStop(1, fieldDeep);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // a wash of the calm pool settling opposite the focal (shaped negative space)
    const ncx = (1 - p.fx) * W, ncy = (1 - p.fy) * H;
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.6);
    cg.addColorStop(0, K.rgba(fieldDeep, 0.5));
    cg.addColorStop(1, K.rgba(P.field, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);

    // ── 2. THE GLASS BODY — coarse grid. Transmitted colour deepened by thickness
    //   (Beer–Lambert), pushed toward the caustic hue where the glass bends. ──
    const step = Math.max(3, Math.floor(Math.min(W, H) / 300));
    const du = 0.004, dv = 0.004;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const h  = thickness(noise, u, v, p);
        if (h < 0.04) continue;                          // bare field shows through
        const hu = thickness(noise, u + du, v, p) - h;
        const hv = thickness(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du; // refraction strength

        // transmitted colour: Beer–Lambert. Even thin glass reads as the SATURATED
        // body hue; thick glass pools DEEPER into the deep jewel tone. The only
        // path to white is the bright caustic crests painted in a later pass — the
        // body itself is always richly coloured, like stained glass.
        const t = K.clamp(h / 1.6, 0, 1);
        let col = K.mix(lit, P.body, K.clamp(t * 3.0, 0, 1));   // saturates fast
        col = K.mix(col, P.deep, K.clamp(t * t * 1.05, 0, 0.9));// thick → deep jewel core

        // refraction tint: where the glass bends, transmitted light splits toward
        // the caustic hue (chromatic refraction) — restrained so body stays dominant.
        const refr = K.clamp(slope * 0.14, 0, 0.32);
        col = K.mix(col, P.caustic, refr * 0.3);

        // alpha rises with thickness; floor kept high so the body covers the bright
        // field rather than letting it bleed through to a pale wash.
        const a = K.clamp(0.6 + t * 0.4, 0, 1);
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(col, a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();

    // ── 3. OVERLAPPING-GLASS LENSING — secondary lens blobs MULTIPLY over the body
    //   so where forms overlap their colours mix into new, deeper hues. ──
    x.save();
    x.globalCompositeOperation = 'multiply';
    for (const b of p.blobs) {
      const bx = b.x * W, by = b.y * H, br = b.r * Math.max(W, H) * 1.4;
      // lens transmitted tint — a saturated mix of body↔caustic; multiplying it
      // over the body DEEPENS the overlap into a new richer hue (real lensing).
      const tint = K.mix(P.body, P.caustic, b.hue * 0.55);
      const bg = x.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, K.rgba(K.mix('#ffffff', tint, 0.35), 1));            // deepest at centre
      bg.addColorStop(0.5, K.rgba(K.mix('#ffffff', tint, 0.18), 1));
      bg.addColorStop(1, 'rgba(255,255,255,1)');                              // no effect outside
      x.fillStyle = bg; x.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    x.restore();

    // ── 4. CAUSTIC BANDS — bright additive ribbons of refracted light, thrown on
    //   the diagonal, strongest over the focal mass; coarse grid. ──
    if (!window.SKIP_CAUSTIC) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const cstep = Math.max(3, Math.floor(Math.min(W, H) / 320));
    for (let yy = 0; yy < H; yy += cstep) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += cstep) {
        const u = xx / W;
        const h = thickness(noise, u, v, p);
        if (h < 0.06) continue;
        const hu = thickness(noise, u + du, v, p) - h;
        const hv = thickness(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        const band = caustic(noise, u, v, p, slope);
        if (band < 0.3) continue;                         // only the bright ribbon crests
        // caustic brightness rides on glass presence + refraction; kept modest so
        // the ribbons read as COLOURED refracted light, not a white flood.
        const amt = K.clamp(band * (0.18 + slope * 0.1) * K.clamp(h, 0, 1.2), 0, 0.32);
        // caustic colour: the COMPLEMENTARY caustic hue dominates (split refracted
        // light), whitening only at the very brightest crests so the band reads as
        // a coloured ribbon of light, not a grey wash.
        const cc = K.mix(P.caustic, P.glint, K.clamp((band - 0.88) * 4, 0, 0.85));
        x.fillStyle = K.rgba(cc, amt);
        x.fillRect(xx, yy, cstep + 1, cstep + 1);
      }
    }
    x.restore();
    }

    // ── 5. CUT-EDGE SPECULAR — crisp bright glints where the slope is steepest
    //   (the facet catching light). Re-walk the grid, only fire on sharp edges. ──
    if (!window.SKIP_SPEC) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const estep = Math.max(2, Math.floor(Math.min(W, H) / 340));
    for (let yy = 0; yy < H; yy += estep) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += estep) {
        const u = xx / W;
        const h = thickness(noise, u, v, p);
        if (h < 0.05) continue;
        const hu = thickness(noise, u + du, v, p) - h;
        const hv = thickness(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        if (slope < 4.8) continue;                       // ONLY the sharpest cut edges
        const gl = K.clamp((slope - 4.8) * 0.07, 0, 0.34);
        // focal edges glint hardest
        const fd = Math.sqrt((u - p.fx) * (u - p.fx) + (v - p.fy) * (v - p.fy));
        const fb = K.clamp(1.1 - fd * 1.0, 0.25, 1);
        x.fillStyle = K.rgba(K.mix(P.caustic, P.glint, 0.55), gl * fb);
        x.fillRect(xx, yy, estep + 1, estep + 1);
        if (slope > 7.5) {
          x.fillStyle = K.rgba(P.glint, K.clamp((slope - 7.5) * 0.06, 0, 0.32) * fb);
          x.fillRect(xx, yy, estep + 1, estep + 1);
        }
      }
    }
    x.restore();
    }

    // ── 6. FOCAL LENSING BLOOM + caustic diagonal hero streak ──
    K.bloom(x, fcx, fcy, Math.max(W, H) * 0.26, K.mix(P.body, P.caustic, 0.4), 0.08);
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.1, P.glint, 0.12);
    // a hero caustic ribbon sweeping edge-to-edge through the focal on the diagonal
    x.save(); x.globalCompositeOperation = 'lighter';
    const hsegs = 90, hlen = Math.max(W, H) * (1.1 + r() * 0.3);
    for (let band = 0; band < 3; band++) {
      const off = (band - 1) * 16;
      x.lineWidth = (3 - band) * 1.8;
      const bandCol = band === 1 ? K.mix(P.caustic, P.glint, 0.6) : K.mix(P.caustic, P.glint, 0.3);
      x.strokeStyle = K.rgba(bandCol, 0.13 - band * 0.035);
      x.beginPath();
      for (let sI = 0; sI <= hsegs; sI++) {
        const tt = sI / hsegs;
        const along = (tt - 0.5) * hlen;
        const wob = Math.sin(tt * Math.PI * (3 + r() * 2)) * 22 * Math.sin(tt * Math.PI);
        const px = fcx + Math.cos(p.ang) * along - Math.sin(p.ang) * (wob + off);
        const py = fcy + Math.sin(p.ang) * along + Math.cos(p.ang) * (wob + off);
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 7. LIGHT-LEAK from an edge (transmitted, keeps the field bright) +
    //   counter-weight glint opposite the focal (asymmetric balance). ──
    const leakSide = r();
    const lkx = leakSide < 0.5 ? -W * 0.05 : W * 1.05;
    const lky = H * (0.15 + r() * 0.7);
    K.bloom(x, lkx, lky, Math.max(W, H) * 0.45, K.mix(P.caustic, P.glint, 0.5), 0.13);
    const ogx = (1 - p.fx) * W + (r() - 0.5) * 0.1 * W;
    const ogy = (1 - p.fy) * H + (r() - 0.5) * 0.1 * H;
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.05, P.glint, 0.4);
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.12, K.mix(P.caustic, P.glint, 0.3), 0.14);

    // ── 8. RARE CHASE EVENTS ──
    if (p.event === 'Caustic Supernova') {
      // full-frame caustic explosion radiating from the focal
      x.save(); x.globalCompositeOperation = 'lighter';
      const rays = 120, maxR = Math.max(W, H) * 1.05;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + noise.fbm(i * 0.3, 0, 3);
        const len = maxR * (0.4 + (noise.fbm(i * 0.7, 5, 3) * 0.5 + 0.5) * 0.6);
        const cc = K.mix(P.caustic, P.glint, (i % 3) / 3);
        x.strokeStyle = K.rgba(cc, 0.10);
        x.lineWidth = 1 + (i % 4) * 0.6;
        x.beginPath(); x.moveTo(fcx, fcy);
        x.lineTo(fcx + Math.cos(a) * len, fcy + Math.sin(a) * len);
        x.stroke();
      }
      K.bloom(x, fcx, fcy, Math.max(W, H) * 0.3, P.glint, 0.3);
      x.restore();
    } else if (p.event === 'Prism Split') {
      // a chromatic prism wedge splitting the body into spectral bands
      x.save();
      x.translate(fcx, fcy); x.rotate(p.ang);
      const pw = Math.max(W, H) * 0.5, ph = Math.max(W, H) * 0.12;
      x.globalCompositeOperation = 'lighter';
      const spec = [P.caustic, P.glint, P.body, P.caustic];
      for (let i = 0; i < spec.length; i++) {
        const oy = (i - spec.length / 2) * ph * 0.5;
        const g = x.createLinearGradient(-pw / 2, 0, pw / 2, 0);
        g.addColorStop(0, K.rgba(spec[i], 0)); g.addColorStop(0.5, K.rgba(spec[i], 0.4)); g.addColorStop(1, K.rgba(spec[i], 0));
        x.fillStyle = g; x.fillRect(-pw / 2, oy - ph * 0.3, pw, ph * 0.6);
      }
      x.restore();
    }

    // ── 9. FILMIC FINISH — refractive edge shimmer, grain, coloured depth. ──
    K.chromaSplit(x, W, H, 2);                              // refraction edge shimmer
    K.grain(x, W, H, 820, r);
    // coloured depth vignette toward the field-deep hue (weight without a void)
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(fcx, fcy, Math.min(W, H) * 0.2, fcx, fcy, Math.max(W, H) * 0.9);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.deep, '#ffffff', 0.5), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'p_glass', draw, traits };
})();
