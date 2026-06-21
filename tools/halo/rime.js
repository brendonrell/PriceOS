/* RIME — CHROME DENDRITES / CRYSTALLINE GROWTH (fast space-colonization DLA)
 *
 * Diffusion-limited-aggregation feel rendered as gleaming electro-deposited
 * metal: self-similar branching filaments grow from seed points toward a cloud
 * of "attractors" (space colonization), so every limb forks organically and
 * thickens toward its root. Branches are painted as a chrome cross-section
 * (dark core flank → hot specular spine → base hue), tips flare iridescent with
 * additive bloom at the growth fronts, and dense thickets pool soft AO.
 *
 * Growth modes per seed: Crown (one central tree), Lattice (many scattered
 * seeds), Starburst (radial from centre), Frost (creeping in from the borders).
 * Density runs sparse-elegant → dense thicket. Abstract; no literal subject. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ── Colorways: mostly bright/saturated grounds, 1-2 dark for range.
     bg=ground, a/b = metal base hues across the branch length (root→tip lean),
     irid = iridescence saturation/light bias, spark = hottest tip pop. ── */
  const PALS = [
    { name: 'Platinum Bloom', bg: '#e2e8f0', metalA: '#56657f', metalB: '#cdd9ea', spark: '#ffffff', irid: 0.62, dark: false },
    { name: 'Rose Chrome',    bg: '#f3d9e2', metalA: '#9a5d78', metalB: '#ffd7e6', spark: '#fff0f6', irid: 0.62, dark: false },
    { name: 'Aqua Frost',     bg: '#cfeef0', metalA: '#2f7f8c', metalB: '#bff2f6', spark: '#f0ffff', irid: 0.7,  dark: false },
    { name: 'Solar Brass',    bg: '#f4e2a8', metalA: '#a87410', metalB: '#ffdf6e', spark: '#fffbe0', irid: 0.55, dark: false },
    { name: 'Mint Alloy',     bg: '#d6f0dc', metalA: '#2f8a5e', metalB: '#c4f5d6', spark: '#f2fff6', irid: 0.62, dark: false },
    { name: 'Violet Mercury', bg: '#e2dcf4', metalA: '#5a4496', metalB: '#d8cdff', spark: '#fbf6ff', irid: 0.68, dark: false },
    { name: 'Coral Steel',    bg: '#f7d6c4', metalA: '#b24a2c', metalB: '#ff9e74', spark: '#fff0e6', irid: 0.6,  dark: false },
    { name: 'Obsidian Oil',   bg: '#0a0c12', metalA: '#3a4660', metalB: '#9fb6e0', spark: '#eaf4ff', irid: 0.85, dark: true },
    { name: 'Nocturne Gold',  bg: '#0d0a06', metalA: '#5a431a', metalB: '#e6c25a', spark: '#fff4cf', irid: 0.7,  dark: true },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  const MODES = ['Crown', 'Lattice', 'Starburst', 'Frost'];
  const DENS = ['Sparse', 'Sparse', 'Balanced', 'Balanced', 'Thicket'];

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

  function densMul(d) { return d === 'Sparse' ? 0.68 : d === 'Thicket' ? 1.55 : 1.05; }

  /* ── Space-colonization growth.
     attractors: cloud of target points. nodes grow toward nearby attractors;
     an attractor within killDist is consumed. Returns edges with depth + a
     per-node order index so we can thicken toward the root and shade tips. ── */
  function grow(seeds, attractors, opts, r) {
    const { stepLen, attrDist, killDist, maxNodes } = opts;
    const nodes = [];
    for (const s of seeds) nodes.push({ x: s.x, y: s.y, parent: -1, gen: 0, dir: s.dir || null });
    const edges = [];
    let attr = attractors.slice();
    let guard = 0;
    while (attr.length && nodes.length < maxNodes && guard++ < 4000) {
      // for each live attractor, find nearest node within influence
      const pull = new Map(); // nodeIdx -> [sumdx,sumdy,count]
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
        // blend with inherited direction for smoother, less jittery limbs
        if (n.dir) { dx = dx * 0.72 + n.dir[0] * 0.28; dy = dy * 0.72 + n.dir[1] * 0.28; }
        const m = Math.hypot(dx, dy) || 1;
        const ux = dx / m, uy = dy / m;
        // small curl wobble for organic, crystalline jitter
        const jx = -uy, jy = ux;
        const w = (r() - 0.5) * 0.5;
        const nx = n.x + (ux + jx * w) * stepLen;
        const ny = n.y + (uy + jy * w) * stepLen;
        const idx = nodes.length + added.length;
        added.push({ x: nx, y: ny, parent: ni, gen: n.gen + 1, dir: [ux, uy] });
        edges.push({ a: ni, b: idx });
      }
      for (const a of added) nodes.push(a);
      // cull consumed attractors
      attr = attr.filter((a) => {
        for (const ni of pull.keys()) {
          const n = nodes[ni];
          if ((a.x - n.x) ** 2 + (a.y - n.y) ** 2 < killDist * killDist) return false;
        }
        return true;
      });
    }
    // compute subtree size (how many descendants) → trunk thickness proxy
    const childCount = new Array(nodes.length).fill(0);
    const order = nodes.map((_, i) => i);
    // process leaves→root: count descendants by walking parents
    for (let i = nodes.length - 1; i >= 0; i--) {
      const p = nodes[i].parent;
      if (p >= 0) childCount[p] += 1 + childCount[i];
    }
    return { nodes, edges, childCount };
  }

  /* paint one branch segment as a metallic chrome cross-section.
     Light is upper-left: -nx,-ny side gets the hot specular, +nx,+ny the dark
     AO flank. Built as nested strokes so even thin limbs read as rounded metal. */
  function metalSeg(x, P, ax, ay, bx, by, width, tipT, sparkT) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // normal
    // base metal hue leans toward the brighter tip alloy near growth fronts
    const base = K.mix(P.metalA, P.metalB, tipT * 0.6);
    x.lineCap = 'round';

    // 0) crisp dark halo for separation against bright grounds
    x.strokeStyle = K.rgba('#0a0c14', 0.4);
    x.lineWidth = width * 1.35;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();

    // 1) dark contact / AO underside — widest, lowest
    x.strokeStyle = K.rgba(K.mix(base, '#05060a', 0.78), 0.7);
    x.lineWidth = width * 1.15;
    x.beginPath();
    x.moveTo(ax + nx * width * 0.18, ay + ny * width * 0.18);
    x.lineTo(bx + nx * width * 0.18, by + ny * width * 0.18);
    x.stroke();

    // 2) mid body — the coloured metal mass (lean a touch richer so colorways
    //    read as COLOUR, not grey chrome)
    x.strokeStyle = K.rgba(K.mix(base, P.metalA, 0.25), 0.96);
    x.lineWidth = width;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();

    // 3) bright base-alloy upper face (toward the light)
    x.strokeStyle = K.rgba(K.mix(base, P.metalB, 0.75), 0.92);
    x.lineWidth = width * 0.6;
    x.beginPath();
    x.moveTo(ax - nx * width * 0.2, ay - ny * width * 0.2);
    x.lineTo(bx - nx * width * 0.2, by - ny * width * 0.2);
    x.stroke();

    // 4) hot specular spine — the chrome glint, additive
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(K.mix(base, '#ffffff', 0.92), 0.55 + sparkT * 0.35);
    x.lineWidth = Math.max(0.7, width * 0.26);
    x.beginPath();
    x.moveTo(ax - nx * width * 0.34, ay - ny * width * 0.34);
    x.lineTo(bx - nx * width * 0.34, by - ny * width * 0.34);
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

    // ── GROUND: a cool, hazy, lightly-graded metallic field ──
    const gg = x.createRadialGradient(W * 0.4, H * 0.34, S * 0.05, W * 0.5, H * 0.55, S * 0.95);
    gg.addColorStop(0, K.mix(P.bg, '#ffffff', P.dark ? 0.06 : 0.16));
    gg.addColorStop(0.6, P.bg);
    gg.addColorStop(1, K.mix(P.bg, P.dark ? '#000' : P.metalA, P.dark ? 0.5 : 0.22));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // soft cool haze wash to make the ground feel atmospheric
    K.hazeSheet(x, W, H, noise, K.mix(P.bg, P.metalB, 0.5), P.dark ? 0.1 : 0.16, 220, 'screen');
    K.mottle(x, 0, 0, W, H, P.metalA, 1400, r, 'overlay');

    // ── build seeds + attractor cloud per growth mode ──
    const seeds = [];
    let attractors = [];
    const cx = W / 2, cy = H / 2;
    const nAttr = Math.floor((p.mode === 'Frost' ? 1900 : 1500) * dm);

    // attractor cloud shaped by fbm so growth pools into organic clumps
    function pushAttr(px, py, mask) {
      const n = (noise.fbm(px / (S * 0.22), py / (S * 0.22), 4) + 1) / 2;
      if (n < (mask == null ? 0.32 : mask)) return;
      attractors.push({ x: px, y: py });
    }

    if (p.mode === 'Crown') {
      const sx = cx + (r() - 0.5) * W * 0.16, sy = H * (0.84 + r() * 0.08);
      seeds.push({ x: sx, y: sy, dir: [0, -1] });
      const spread = S * (0.28 + r() * 0.08), top = H * (0.08 + r() * 0.1);
      for (let i = 0; i < nAttr; i++) {
        const t = r();
        const px = sx + (r() - 0.5) * spread * 2 * (0.4 + t);
        const py = sy - t * (sy - top);
        pushAttr(px, py, 0.28);
      }
    } else if (p.mode === 'Lattice') {
      const ns = K.rint(r, 5, 9);
      for (let i = 0; i < ns; i++) seeds.push({ x: W * (0.12 + r() * 0.76), y: H * (0.12 + r() * 0.76) });
      for (let i = 0; i < nAttr; i++) pushAttr(r() * W, r() * H, 0.34);
    } else if (p.mode === 'Starburst') {
      seeds.push({ x: cx, y: cy });
      // a ring of secondary seeds for a fuller crown
      const sec = K.rint(r, 4, 8);
      for (let i = 0; i < sec; i++) { const a = (i / sec) * Math.PI * 2; seeds.push({ x: cx + Math.cos(a) * S * 0.04, y: cy + Math.sin(a) * S * 0.04, dir: [Math.cos(a), Math.sin(a)] }); }
      const rad = S * (0.4 + r() * 0.08);
      for (let i = 0; i < nAttr; i++) {
        const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.6) * rad;
        pushAttr(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.3);
      }
    } else { // Frost — creep in from borders
      const edges4 = [0, 1, 2, 3];
      const nSeed = K.rint(r, 10, 18);
      for (let i = 0; i < nSeed; i++) {
        const e = K.pick(edges4, r), t = r();
        if (e === 0) seeds.push({ x: t * W, y: 0, dir: [0, 1] });
        else if (e === 1) seeds.push({ x: W, y: t * H, dir: [-1, 0] });
        else if (e === 2) seeds.push({ x: t * W, y: H, dir: [0, -1] });
        else seeds.push({ x: 0, y: t * H, dir: [1, 0] });
      }
      for (let i = 0; i < nAttr; i++) {
        // bias attractors toward edges (frost creeps inward, fades at centre)
        const ex = Math.pow(r(), 1.6), side = r() < 0.5 ? ex : 1 - ex;
        const ey = Math.pow(r(), 1.6), side2 = r() < 0.5 ? ey : 1 - ey;
        pushAttr((r() < 0.5 ? side : r()) * W, (r() < 0.5 ? r() : side2) * H, 0.3);
      }
    }

    const stepLen = S * (0.0085 + (1 - Math.min(1, dm)) * 0.003);
    const g = grow(seeds, attractors, {
      stepLen,
      attrDist: S * (p.mode === 'Frost' ? 0.16 : 0.2),
      killDist: stepLen * 1.5,
      maxNodes: Math.floor(4200 * dm),
    }, r);

    const { nodes, edges, childCount } = g;
    const maxChild = Math.max(1, ...childCount);

    // ── soft AO under dense clusters (multiply pools where childCount high) ──
    x.save();
    for (let i = 0; i < nodes.length; i++) {
      const c = childCount[i];
      if (c < maxChild * 0.06) continue;
      const t = c / maxChild;
      K.softShadow(x, nodes[i].x + S * 0.012, nodes[i].y + S * 0.012, S * (0.02 + t * 0.05), 0.05 + t * 0.08);
    }
    x.restore();

    // ── paint branches root→tip (thick trunks first so tips sit on top) ──
    const order = edges.slice().sort((e1, e2) => childCount[e2.a] - childCount[e1.a]);
    const trunkW = S * (0.02 + 0.008 * (1 - Math.min(1, dm)));
    for (const e of order) {
      const a = nodes[e.a], b = nodes[e.b];
      const tw = childCount[e.a] / maxChild;
      const width = Math.max(1.1, trunkW * Math.pow(tw, 0.5) + 1.0);
      const gen = b.gen;
      const tipT = K.clamp(gen / 26, 0, 1);           // hue lean toward tip
      const isTip = childCount[e.b] === 0;
      const sparkT = isTip ? 1 : K.clamp(1 - tw, 0, 1) * 0.5;
      metalSeg(x, P, a.x, a.y, b.x, b.y, width, tipT, sparkT);
    }

    // ── iridescent growth fronts.
    //    Tips get a small flare elongated ALONG the branch direction (a glint,
    //    not a bead). Only a sampled subset blooms, so fronts feel like rare
    //    crystalline sparks rather than uniform sprinkles. ──
    const tipPhase = r();
    const leaves = [];
    for (let i = 0; i < nodes.length; i++) if (childCount[i] === 0) leaves.push(i);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let li = 0; li < leaves.length; li++) {
      const i = leaves[li];
      const n = nodes[i];
      const par = n.parent >= 0 ? nodes[n.parent] : null;
      const phase = tipPhase + (noise.fbm(n.x / (S * 0.28), n.y / (S * 0.28), 3) + 1) * 0.5;
      const irc = K.iridescent(phase, P.irid, P.dark ? 0.64 : 0.6);
      const rad = S * (0.0045 + (li % 3 === 0 ? 0.004 : 0.0015));
      // tiny dark seed under the glint so iridescence survives on bright grounds
      x.save(); x.globalCompositeOperation = 'source-over';
      x.fillStyle = K.rgba(K.mix(P.metalA, '#05060a', 0.5), 0.5);
      x.beginPath(); x.arc(n.x, n.y, rad * 0.6, 0, Math.PI * 2); x.fill();
      x.restore();
      // glint core
      const gr = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad);
      gr.addColorStop(0, K.rgba(P.spark, 0.9));
      gr.addColorStop(0.35, K.rgba(irc, 0.6));
      gr.addColorStop(1, K.rgba(irc, 0));
      x.fillStyle = gr; x.beginPath(); x.arc(n.x, n.y, rad, 0, Math.PI * 2); x.fill();
      // directional iridescent flick along the limb
      if (par && li % 2 === 0) {
        const dx = n.x - par.x, dy = n.y - par.y, m = Math.hypot(dx, dy) || 1;
        x.strokeStyle = K.rgba(irc, 0.5);
        x.lineWidth = 1.1;
        x.beginPath(); x.moveTo(n.x, n.y);
        x.lineTo(n.x + (dx / m) * rad * 2.4, n.y + (dy / m) * rad * 2.4); x.stroke();
      }
    }
    x.restore();

    // bloom at a sparse sample of fronts (focal glows, not everywhere)
    let bcount = 0;
    for (let li = 0; li < leaves.length; li += 9) {
      if (bcount++ > 50) break;
      const n = nodes[leaves[li]];
      const phase = tipPhase + (noise.fbm(n.x / (S * 0.28), n.y / (S * 0.28), 3) + 1) * 0.5;
      K.bloom(x, n.x, n.y, S * (0.018 + r() * 0.022), K.iridescent(phase, P.irid, 0.6), 0.1);
    }

    // ── a single sheen sweep across the composition for the headline gloss ──
    const scx = W * (0.3 + r() * 0.4), scy = H * (0.22 + r() * 0.3);
    K.sheen(x, scx, scy, S * (0.42 + r() * 0.12), K.mix(P.spark, P.metalB, 0.3), P.dark ? 0.16 : 0.12);

    // ── finish: cool haze, faint chroma sheen, grain, vignette ──
    K.hazeSheet(x, W, H, noise, K.mix(P.metalB, P.spark, 0.4), P.dark ? 0.08 : 0.07, 300, 'screen');
    K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 620, r);
    K.vignette(x, W, H, P.dark ? 0.5 : 0.34);
    return { aspect: W / H };
  }

  return { name: 'rime', draw, traits };
})();
