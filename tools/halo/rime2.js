/* RIME2 — CHROME DENDRITES / CRYSTALLINE GROWTH (winner's variation)
 *
 * Evolution of RIME. Same DLA / space-colonization growth, same 4 modes, same
 * per-seed variety and fine filigree — but the jury demanded three fixes and
 * this build is built around them:
 *
 *   1. SHEEN. Every branch is now an electro-deposited metal cross-section:
 *      a dark AO flank, a coloured metal body, a bright base-alloy face, and a
 *      hot additive specular spine, with iridescent thin-film colour shifting
 *      along the limb and pooling at the growth tips. Tips fire tight specular
 *      glints + bloom so the fronts read as wet, gleaming crystal — not ink.
 *
 *   2. COLOUR-FORWARD on BRIGHT grounds. Most colorways are now genuinely
 *      bright, saturated JEWEL grounds (teal, magenta, cobalt, viridian,
 *      amber, coral, violet). On those, branches carry their OWN saturated /
 *      iridescent metal hue plus a crisp thin dark separation halo so they pop
 *      and never go muddy/beige. Two dark premium colorways (Nocturne Gold,
 *      Obsidian Oil) are kept as the rare dark range.
 *
 *   3. FRAMING + RARITY. Growth is pulled to fill more of the frame, and a
 *      faint substrate texture + vignette reads any margin as intentional
 *      matting, not blank canvas. Starburst (the eye-catching but self-similar
 *      medallion) is now RARE — a chase mode, not a default.
 *
 * Growth modes: Crown (one central tree), Lattice (scattered seeds), Starburst
 * (radial medallion — rare), Frost (creeping in from the borders). Abstract;
 * no literal subject. Render ~1-3s/image. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ── Colorways. bg = ground.  metalA/metalB = metal base hues root→tip.
     iridA = iridescence hue centre (turns), irid = iridescence saturation,
     spark = hottest tip pop. dark = the rare premium dark range. ──
     Bright grounds are saturated JEWEL tones; their branches carry their own
     vivid hue so they POP against the colour, never wash to beige. */
  const PALS = [
    // ── bright / saturated JEWEL grounds ──
    { name: 'Electric Teal',  bg: '#0fb6c2', metalA: '#063e52', metalB: '#a9fff0', spark: '#ffffff', iridA: 0.46, irid: 0.92, dark: false },
    { name: 'Magenta Flux',   bg: '#d61f8c', metalA: '#4a0a3a', metalB: '#ffd0ef', spark: '#fff2fb', iridA: 0.82, irid: 0.95, dark: false },
    { name: 'Cobalt Arc',     bg: '#1b53d6', metalA: '#08163f', metalB: '#bcd4ff', spark: '#f2f7ff', iridA: 0.60, irid: 0.92, dark: false },
    { name: 'Viridian Edge',  bg: '#11a05a', metalA: '#073320', metalB: '#b6ffd2', spark: '#f0fff6', iridA: 0.40, irid: 0.9, dark: false },
    { name: 'Amber Gold',     bg: '#f2a519', metalA: '#5a3206', metalB: '#fff0bf', spark: '#fffae6', iridA: 0.12, irid: 0.85, dark: false },
    { name: 'Coral Flare',    bg: '#f0573a', metalA: '#5c1408', metalB: '#ffd6b0', spark: '#fff1e8', iridA: 0.06, irid: 0.9, dark: false },
    { name: 'Violet Surge',   bg: '#7a3cf0', metalA: '#2a0a52', metalB: '#e2cfff', spark: '#f8f2ff', iridA: 0.74, irid: 0.95, dark: false },
    // ── rare premium DARK range ──
    { name: 'Nocturne Gold',  bg: '#0d0a06', metalA: '#5a431a', metalB: '#ffd874', spark: '#fff4cf', iridA: 0.13, irid: 0.8, dark: true },
    { name: 'Obsidian Oil',   bg: '#0a0c12', metalA: '#2c3a5e', metalB: '#9fd0ff', spark: '#eaf6ff', iridA: 0.58, irid: 0.95, dark: true },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  // Starburst weighted RARE — a chase mode, not a default.
  const MODES = ['Crown', 'Crown', 'Crown', 'Lattice', 'Lattice', 'Lattice', 'Frost', 'Frost', 'Frost', 'Starburst'];
  const DENS = ['Sparse', 'Balanced', 'Balanced', 'Thicket'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODES, r);
    const dens = K.pick(DENS, r);
    return { pal, fmt, mode, dens };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Growth: p.mode, Density: p.dens };
  }

  function densMul(d) { return d === 'Sparse' ? 0.82 : d === 'Thicket' ? 1.6 : 1.15; }

  /* ── Space-colonization growth (unchanged core — preserves variety). ── */
  function grow(seeds, attractors, opts, r) {
    const { stepLen, attrDist, killDist, maxNodes } = opts;
    const nodes = [];
    for (const s of seeds) nodes.push({ x: s.x, y: s.y, parent: -1, gen: 0, dir: s.dir || null });
    const edges = [];
    let attr = attractors.slice();
    let guard = 0;
    while (attr.length && nodes.length < maxNodes && guard++ < 4000) {
      const pull = new Map();
      for (let ai = 0; ai < attr.length; ai++) {
        const a = attr[ai];
        let best = -1, bd = attrDist * attrDist;
        for (let ni = 0; ni < nodes.length; ni++) {
          const n = nodes[ni];
          const dx = a.x - n.x, dy = a.y - n.y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = ni; }
        }
        if (best >= 0) {
          const dx = a.x - nodes[best].x, dy = a.y - nodes[best].y, m = Math.hypot(dx, dy) || 1;
          const e = pull.get(best) || [0, 0, 0];
          e[0] += dx / m; e[1] += dy / m; e[2]++;
          pull.set(best, e);
        }
      }
      if (!pull.size) break;
      const added = [];
      for (const [ni, e] of pull) {
        const n = nodes[ni];
        let dx = e[0], dy = e[1];
        if (n.dir) { dx = dx * 0.72 + n.dir[0] * 0.28; dy = dy * 0.72 + n.dir[1] * 0.28; }
        const m = Math.hypot(dx, dy) || 1;
        const ux = dx / m, uy = dy / m;
        const jx = -uy, jy = ux;
        const w = (r() - 0.5) * 0.5;
        const nx = n.x + (ux + jx * w) * stepLen;
        const ny = n.y + (uy + jy * w) * stepLen;
        const idx = nodes.length + added.length;
        added.push({ x: nx, y: ny, parent: ni, gen: n.gen + 1, dir: [ux, uy] });
        edges.push({ a: ni, b: idx });
      }
      for (const a of added) nodes.push(a);
      attr = attr.filter((a) => {
        for (const ni of pull.keys()) {
          const n = nodes[ni];
          if ((a.x - n.x) ** 2 + (a.y - n.y) ** 2 < killDist * killDist) return false;
        }
        return true;
      });
    }
    const childCount = new Array(nodes.length).fill(0);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const p = nodes[i].parent;
      if (p >= 0) childCount[p] += 1 + childCount[i];
    }
    return { nodes, edges, childCount };
  }

  /* ── paint one branch segment as a gleaming chrome cross-section ──
     The headline SHEEN fix. Light is upper-left; the limb is built as nested
     offset strokes so it reads as a rounded electro-deposited wire:
       halo (crisp dark separation against bright grounds)
       → AO underside → coloured metal body → iridescent shift band
       → bright base-alloy face → hot additive specular spine.
     `bodyHue` is the segment's own metal colour (already iridescent-shifted by
     the caller), so on bright grounds the branch is VIVID, not grey. */
  function metalSeg(x, P, ax, ay, bx, by, width, bodyHue, irc, sparkT) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // normal
    x.lineCap = 'round';

    // 0) crisp dark separation halo — ambient occlusion / pop against ground
    x.strokeStyle = K.rgba('#05060c', P.dark ? 0.34 : 0.5);
    x.lineWidth = width * 1.5;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();

    // 1) dark contact / AO underside flank (offset toward shadow side)
    x.strokeStyle = K.rgba(K.mix(bodyHue, '#04050a', 0.72), 0.82);
    x.lineWidth = width * 1.12;
    x.beginPath();
    x.moveTo(ax + nx * width * 0.2, ay + ny * width * 0.2);
    x.lineTo(bx + nx * width * 0.2, by + ny * width * 0.2);
    x.stroke();

    // 2) the coloured metal body — the saturated mass that carries the colour
    x.strokeStyle = K.rgba(bodyHue, 0.98);
    x.lineWidth = width;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();

    // 3) iridescent thin-film shift band, additive, slightly lit side
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(irc, 0.5);
    x.lineWidth = width * 0.66;
    x.beginPath();
    x.moveTo(ax - nx * width * 0.14, ay - ny * width * 0.14);
    x.lineTo(bx - nx * width * 0.14, by - ny * width * 0.14);
    x.stroke();
    x.restore();

    // 4) bright base-alloy upper face (toward the light)
    x.strokeStyle = K.rgba(K.mix(bodyHue, P.metalB, 0.85), 0.95);
    x.lineWidth = width * 0.5;
    x.beginPath();
    x.moveTo(ax - nx * width * 0.26, ay - ny * width * 0.26);
    x.lineTo(bx - nx * width * 0.26, by - ny * width * 0.26);
    x.stroke();

    // 5) hot specular spine — the chrome glint, additive, hottest at tips
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(K.mix(P.metalB, '#ffffff', 0.9), 0.6 + sparkT * 0.4);
    x.lineWidth = Math.max(0.8, width * 0.28);
    x.beginPath();
    x.moveTo(ax - nx * width * 0.4, ay - ny * width * 0.4);
    x.lineTo(bx - nx * width * 0.4, by - ny * width * 0.4);
    x.stroke();
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const S = Math.min(W, H);
    const dm = densMul(p.dens);

    // ── GROUND: a rich, lightly-graded JEWEL field (or deep dark for the
    //    premium range). Saturated so colorways read as COLOUR. ──
    const bright = !P.dark;
    const gg = x.createRadialGradient(W * 0.4, H * 0.34, S * 0.05, W * 0.5, H * 0.56, S * 0.98);
    gg.addColorStop(0, K.mix(P.bg, '#ffffff', bright ? 0.22 : 0.07));
    gg.addColorStop(0.55, P.bg);
    gg.addColorStop(1, K.mix(P.bg, P.dark ? '#000' : '#04060e', P.dark ? 0.55 : 0.4));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // faint iridescent atmosphere wash so the ground itself feels oil-slick
    K.hazeSheet(x, W, H, noise, K.iridescent(P.iridA + 0.12, 0.7, bright ? 0.62 : 0.5), bright ? 0.1 : 0.12, 240, 'screen');
    // substrate texture — reads any margin as intentional matting, not blank
    K.mottle(x, 0, 0, W, H, P.bg, 1100, r, bright ? 'soft-light' : 'overlay');

    // ── build seeds + attractor cloud per growth mode.
    //    Spreads pushed WIDER than RIME so growth fills more of the frame. ──
    const seeds = [];
    let attractors = [];
    const cx = W / 2, cy = H / 2;
    const nAttr = Math.floor((p.mode === 'Frost' ? 2300 : 2000) * dm);

    function pushAttr(px, py, mask) {
      const n = (noise.fbm(px / (S * 0.22), py / (S * 0.22), 4) + 1) / 2;
      if (n < (mask == null ? 0.3 : mask)) return;
      attractors.push({ x: px, y: py });
    }

    if (p.mode === 'Crown') {
      const sx = cx + (r() - 0.5) * W * 0.18, sy = H * (0.9 + r() * 0.05);
      seeds.push({ x: sx, y: sy, dir: [0, -1] });
      const spread = S * (0.38 + r() * 0.1), top = H * (0.05 + r() * 0.06);
      for (let i = 0; i < nAttr; i++) {
        const t = r();
        const px = sx + (r() - 0.5) * spread * 2 * (0.5 + t);
        const py = sy - t * (sy - top);
        pushAttr(px, py, 0.26);
      }
    } else if (p.mode === 'Lattice') {
      const ns = K.rint(r, 7, 11);
      for (let i = 0; i < ns; i++) seeds.push({ x: W * (0.08 + r() * 0.84), y: H * (0.08 + r() * 0.84) });
      for (let i = 0; i < nAttr; i++) pushAttr(W * (0.04 + r() * 0.92), H * (0.04 + r() * 0.92), 0.24);
    } else if (p.mode === 'Starburst') {
      seeds.push({ x: cx, y: cy });
      const sec = K.rint(r, 5, 9);
      for (let i = 0; i < sec; i++) { const a = (i / sec) * Math.PI * 2; seeds.push({ x: cx + Math.cos(a) * S * 0.04, y: cy + Math.sin(a) * S * 0.04, dir: [Math.cos(a), Math.sin(a)] }); }
      const rad = S * (0.46 + r() * 0.08);
      for (let i = 0; i < nAttr; i++) {
        const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.55) * rad;
        pushAttr(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.28);
      }
    } else { // Frost — creep in from borders
      const edges4 = [0, 1, 2, 3];
      const nSeed = K.rint(r, 12, 20);
      for (let i = 0; i < nSeed; i++) {
        const e = K.pick(edges4, r), t = r();
        if (e === 0) seeds.push({ x: t * W, y: 0, dir: [0, 1] });
        else if (e === 1) seeds.push({ x: W, y: t * H, dir: [-1, 0] });
        else if (e === 2) seeds.push({ x: t * W, y: H, dir: [0, -1] });
        else seeds.push({ x: 0, y: t * H, dir: [1, 0] });
      }
      for (let i = 0; i < nAttr; i++) {
        const ex = Math.pow(r(), 1.5), side = r() < 0.5 ? ex : 1 - ex;
        const ey = Math.pow(r(), 1.5), side2 = r() < 0.5 ? ey : 1 - ey;
        pushAttr((r() < 0.5 ? side : r()) * W, (r() < 0.5 ? r() : side2) * H, 0.28);
      }
    }

    const stepLen = S * (0.0085 + (1 - Math.min(1, dm)) * 0.003);
    const g = grow(seeds, attractors, {
      stepLen,
      attrDist: S * (p.mode === 'Frost' ? 0.17 : 0.21),
      killDist: stepLen * 1.5,
      maxNodes: Math.floor(4600 * dm),
    }, r);

    const { nodes, edges, childCount } = g;
    const maxChild = Math.max(1, ...childCount);
    const maxGen = Math.max(1, ...nodes.map((n) => n.gen));

    // ── soft AO under dense clusters (pools depth where childCount high) ──
    x.save();
    for (let i = 0; i < nodes.length; i++) {
      const c = childCount[i];
      if (c < maxChild * 0.06) continue;
      const t = c / maxChild;
      K.softShadow(x, nodes[i].x + S * 0.012, nodes[i].y + S * 0.012, S * (0.02 + t * 0.05), 0.06 + t * 0.09);
    }
    x.restore();

    // global iridescence phase offset per seed for variety
    const iPhase = r();
    // per-segment iridescent hue: drift along the limb + fbm field
    // hue kept in a tight band AROUND the palette's iridA so the thin-film
    // shimmer harmonizes with the ground instead of clashing (e.g. no random
    // green band across a magenta piece).
    function segIrid(midx, midy, gen) {
      const along = gen / maxGen;
      const field = (noise.fbm(midx / (S * 0.3), midy / (S * 0.3), 3) + 1) * 0.5;
      const phase = P.iridA + iPhase * 0.06 + along * 0.22 + field * 0.16 - 0.19;
      return K.iridescent(phase, P.irid, bright ? 0.62 : 0.64);
    }

    // ── paint branches root→tip (thick trunks first so tips sit on top) ──
    const order = edges.slice().sort((e1, e2) => childCount[e2.a] - childCount[e1.a]);
    const trunkW = S * (0.027 + 0.011 * (1 - Math.min(1, dm)));
    for (const e of order) {
      const a = nodes[e.a], b = nodes[e.b];
      const tw = childCount[e.a] / maxChild;
      const width = Math.max(1.1, trunkW * Math.pow(tw, 0.5) + 1.0);
      const gen = b.gen;
      const tipT = K.clamp(gen / maxGen, 0, 1);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const irc = segIrid(mx, my, gen);
      // body hue: saturated metal mass, leaning toward the iridescent tone so
      // the branch carries vivid colour (the #2 fix) — brighter toward tips.
      const baseMetal = K.mix(P.metalA, P.metalB, 0.42 + tipT * 0.45);
      // pull every limb toward its iridescent hue so even thick trunks stay
      // saturated colour, never a muddy dark mass (the #2 fix at the root).
      const bodyHue = K.mix(baseMetal, irc, bright ? 0.5 : 0.34);
      const isTip = childCount[e.b] === 0;
      const sparkT = isTip ? 1 : K.clamp(1 - tw, 0, 1) * 0.5;
      metalSeg(x, P, a.x, a.y, b.x, b.y, width, bodyHue, irc, sparkT);
    }

    // ── iridescent growth fronts: glints + bloom (the wet-metal tips) ──
    const leaves = [];
    for (let i = 0; i < nodes.length; i++) if (childCount[i] === 0) leaves.push(i);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let li = 0; li < leaves.length; li++) {
      const i = leaves[li];
      const n = nodes[i];
      const par = n.parent >= 0 ? nodes[n.parent] : null;
      const irc = segIrid(n.x, n.y, n.gen);
      const rad = S * (0.005 + (li % 3 === 0 ? 0.0045 : 0.0016));
      // tiny dark seed under the glint so iridescence survives on bright grounds
      x.save(); x.globalCompositeOperation = 'source-over';
      x.fillStyle = K.rgba(K.mix(P.metalA, '#04050a', 0.55), 0.55);
      x.beginPath(); x.arc(n.x, n.y, rad * 0.7, 0, Math.PI * 2); x.fill();
      x.restore();
      // glint core
      const gr = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad);
      gr.addColorStop(0, K.rgba(P.spark, 0.95));
      gr.addColorStop(0.32, K.rgba(irc, 0.7));
      gr.addColorStop(1, K.rgba(irc, 0));
      x.fillStyle = gr; x.beginPath(); x.arc(n.x, n.y, rad, 0, Math.PI * 2); x.fill();
      // directional iridescent flick along the limb
      if (par && li % 2 === 0) {
        const dx = n.x - par.x, dy = n.y - par.y, m = Math.hypot(dx, dy) || 1;
        x.strokeStyle = K.rgba(irc, 0.55);
        x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(n.x, n.y);
        x.lineTo(n.x + (dx / m) * rad * 2.6, n.y + (dy / m) * rad * 2.6); x.stroke();
      }
    }
    x.restore();

    // tight specular sheen lobes at a sparse sample of fronts (focal glints)
    let scount = 0;
    for (let li = 0; li < leaves.length; li += 7) {
      if (scount++ > 70) break;
      const n = nodes[leaves[li]];
      const irc = segIrid(n.x, n.y, n.gen);
      K.sheen(x, n.x, n.y, S * (0.012 + r() * 0.016), K.mix(P.spark, irc, 0.4), 0.16);
      if (li % 3 === 0) K.bloom(x, n.x, n.y, S * (0.02 + r() * 0.02), irc, 0.12);
    }

    // ── headline gloss: one broad sheen sweep across the composition ──
    const scx = W * (0.3 + r() * 0.4), scy = H * (0.2 + r() * 0.3);
    K.sheen(x, scx, scy, S * (0.45 + r() * 0.12), K.mix(P.spark, P.metalB, 0.3), P.dark ? 0.18 : 0.14);

    // ── finish: faint iridescent haze, chroma sheen, grain, vignette matte ──
    K.hazeSheet(x, W, H, noise, K.mix(P.metalB, P.spark, 0.4), P.dark ? 0.08 : 0.06, 300, 'screen');
    K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 620, r);
    K.vignette(x, W, H, P.dark ? 0.5 : 0.42);
    return { aspect: W / H };
  }

  return { name: 'rime2', draw, traits };
})();
