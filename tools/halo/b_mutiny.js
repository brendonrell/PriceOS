/* QUIET MUTINY — concrete art, after Vera Molnar / Max Bill, but its own thing.
 * A SYSTEMATIC FIELD of repeated geometric units (rotated squares, nested frames,
 * a ruled grid) into which controlled DISORDER slowly creeps: units tilt, drift,
 * break and fracture toward one zone. Order-vs-chaos IS the subject — pure geometry,
 * no scene, no object, no horizon. Ink on warm paper + a single restrained accent.
 *
 * Surface is screenprint/risograph, not flat clip-art: paper tooth, mottle, slightly
 * imperfect hand-drawn edges, a whisper of haze, a vignette grade.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded.
 *
 * Anti-collision contract: EVERY salient parameter varies CONTINUOUSLY with the
 * seed (counts, positions, sizes, ratios, rotations, spacings, asymmetry, focal
 * placement, crop/zoom, density, format aspect, and the colour VALUES themselves,
 * jittered within the palette-world). Structure is de-correlated from palette, so
 * two same-mode / same-palette pieces still differ hard. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six palettes, ONE austere world: graphite ink on warm paper — the canonical
     Molnar look — PLUS one inverted ink-ground frame (chalk-white rules on near-black)
     so the set is mostly-paper but not 100% paper. paper=ground, ink=line/fill,
     soft=mid-tone wash, accent=the lone disobedient colour. */
  const PALS = [
    // warm cream paper · graphite · vermilion accent (the canonical Molnar look)
    { name: 'Graphite & Vermilion', paper: '#e9e1d2', paper2: '#ddd2bd', ink: '#262220', soft: '#7c7368', accent: '#c4402a', rare: false },
    // bone paper · near-black · cobalt accent
    { name: 'Bone & Cobalt',        paper: '#ece7da', paper2: '#dcd4c2', ink: '#1f2024', soft: '#6f7178', accent: '#2c4f8a', rare: false },
    // INK GROUND — near-black charcoal stock · chalk-white rules · cold steel accent
    // (the lone dark frame: white-on-black inversion keeps the Molnar geometry, flips the value)
    { name: 'Ink & Chalk',          paper: '#16181b', paper2: '#1f2227', ink: '#e7e4db', soft: '#8c9099', accent: '#6f96b8', rare: true },
    // toasted oat paper · sepia ink · ox-blood accent
    { name: 'Oat & Oxblood',        paper: '#e6dcc6', paper2: '#d6c8aa', ink: '#2c241c', soft: '#8a7a63', accent: '#7c2b22', rare: false },
    // grey newsprint · ink-black · mustard accent (riso feel)
    { name: 'Newsprint & Mustard',  paper: '#dcd8cd', paper2: '#c9c4b5', ink: '#1d1c1a', soft: '#74716a', accent: '#c79234', rare: false },
    // deep warm putty · charcoal · teal accent (rare, the cool-warm tension one)
    { name: 'Putty & Teal',         paper: '#e3d9c7', paper2: '#d2c5ad', ink: '#23211e', soft: '#7a7367', accent: '#2c6b66', rare: true },
  ];

  const MODES = ['Tilt Cascade', 'Broken Frames', 'Ruled Drift', 'Fracture Zone', 'Quiet Rotation', 'Defector Grid'];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    // weight: rare palettes appear less often (austere grails)
    const pool = [];
    for (const p of PALS) { const w = p.rare ? 1 : 3; for (let i = 0; i < w; i++) pool.push(p); }
    return K.pick(pool, r);
  }

  /* Jitter one hex colour within its own value-world: a small, deterministic shift
     of hue / saturation / lightness so the palette READS the same but no two seeds
     share identical ink/accent values. Keeps the austere look; just de-templates colour. */
  function rgb2hsl(c) {
    const R = c[0] / 255, G = c[1] / 255, B = c[2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === R) h = ((G - B) / d) % 6;
      else if (mx === G) h = (B - R) / d + 2;
      else h = (R - G) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function jitterCol(hex, dh, ds, dl) {
    const hsl = rgb2hsl(K.h2r(hex));
    return K.hsl2hex(hsl[0] + dh, K.clamp(hsl[1] + ds, 0, 1), K.clamp(hsl[2] + dl, 0, 1));
  }
  // produce a per-seed jittered clone of the palette (NOT applied when FORCE_PAL,
  // so the colorway jury sees the canonical swatch unmutated)
  function jitterPal(pal, r) {
    if (window.FORCE_PAL) return pal;
    const inkLshift = (r() - 0.5) * 0.05;
    const acc = { dh: (r() - 0.5) * 22, ds: (r() - 0.5) * 0.16, dl: (r() - 0.5) * 0.10 };
    const pap = { dh: (r() - 0.5) * 8, ds: (r() - 0.5) * 0.05, dl: (r() - 0.5) * 0.035 };
    return {
      name: pal.name, rare: pal.rare,
      paper: jitterCol(pal.paper, pap.dh, pap.ds, pap.dl),
      paper2: jitterCol(pal.paper2, pap.dh, pap.ds, pap.dl - 0.01),
      ink: jitterCol(pal.ink, (r() - 0.5) * 6, (r() - 0.5) * 0.06, inkLshift),
      soft: jitterCol(pal.soft, (r() - 0.5) * 10, (r() - 0.5) * 0.08, (r() - 0.5) * 0.05),
      accent: jitterCol(pal.accent, acc.dh, acc.ds, acc.dl),
    };
  }

  /* ── hand-imperfect stroke / rect helpers (jitter so edges read drawn, not vector) ── */
  function jp(x, y, j, r) { return [x + (r() - 0.5) * j, y + (r() - 0.5) * j]; }

  // a slightly wobbled rectangle outline (4 segments, each end jittered). w,h independent.
  function handRect(x, w, h, lw, col, a, r, j) {
    j = j == null ? Math.max(0.8, lw * 0.7) : j;
    x.save();
    x.strokeStyle = K.rgba(col, a == null ? 1 : a);
    x.lineWidth = lw; x.lineJoin = 'round'; x.lineCap = 'round';
    const p0 = jp(-w / 2, -h / 2, j, r), p1 = jp(w / 2, -h / 2, j, r),
          p2 = jp(w / 2, h / 2, j, r), p3 = jp(-w / 2, h / 2, j, r);
    x.beginPath();
    x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]);
    x.lineTo(p2[0], p2[1]); x.lineTo(p3[0], p3[1]); x.closePath();
    x.stroke();
    x.restore();
  }

  // a wobbled filled rect (for solid accent / ink units). w,h independent.
  function handFill(x, w, h, col, a, r, j) {
    j = j == null ? 1.4 : j;
    x.save();
    x.fillStyle = K.rgba(col, a == null ? 1 : a);
    const p0 = jp(-w / 2, -h / 2, j, r), p1 = jp(w / 2, -h / 2, j, r),
          p2 = jp(w / 2, h / 2, j, r), p3 = jp(-w / 2, h / 2, j, r);
    x.beginPath();
    x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]);
    x.lineTo(p2[0], p2[1]); x.lineTo(p3[0], p3[1]); x.closePath();
    x.fill();
    x.restore();
  }

  // a single wobbled line segment
  function handLine(x, x1, y1, x2, y2, lw, col, a, r, j) {
    j = j == null ? 1.2 : j;
    x.save();
    x.strokeStyle = K.rgba(col, a == null ? 1 : a);
    x.lineWidth = lw; x.lineCap = 'round';
    const mx = (x1 + x2) / 2 + (r() - 0.5) * j * 2, my = (y1 + y2) / 2 + (r() - 0.5) * j * 2;
    const a0 = jp(x1, y1, j, r), a1 = jp(x2, y2, j, r);
    x.beginPath();
    x.moveTo(a0[0], a0[1]);
    x.quadraticCurveTo(mx, my, a1[0], a1[1]);
    x.stroke();
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const basePal = pickPal(r);
    const pal = jitterPal(basePal, r);
    const mode = K.pick(MODES, r);

    // ── FORMAT: continuous aspect (was 3 discrete tiles). Wide span, biased to
    //    classic concrete-art proportions but never two seeds the same shape. ──
    const aspect = 0.74 + r() * 0.74;        // 0.74 (portrait) → 1.48 (landscape), continuous
    const longEdge = 1180 + Math.round((r() - 0.5) * 220); // global pixel scale varies too
    let W, H;
    if (aspect >= 1) { W = longEdge; H = Math.round(longEdge / aspect); }
    else { H = longEdge; W = Math.round(longEdge * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── DISORDER ORIGIN: continuous point anywhere along the frame's perimeter-ish
    //    region (not 8 fixed corners). A primary front + a faint secondary lobe so
    //    the chaos geometry is never a repeatable template. ──
    const edge = r();                         // 0..1 walk around the border
    function edgePoint(t) {
      // map t∈[0,1] around the rectangle border, then pull slightly inward by a random bias
      const p = t * 4;
      let u, v;
      if (p < 1) { u = p; v = 0; }
      else if (p < 2) { u = 1; v = p - 1; }
      else if (p < 3) { u = 3 - p; v = 1; }
      else { u = 0; v = 4 - p; }
      return [u, v];
    }
    const og0 = edgePoint(edge);
    const inward = r() * 0.22;
    const ogx = og0[0] + (0.5 - og0[0]) * inward;
    const ogy = og0[1] + (0.5 - og0[1]) * inward;
    // secondary lobe: a weaker, independent chaos source somewhere else
    const og2 = edgePoint((edge + 0.25 + r() * 0.5) % 1);
    const lobe2 = 0.15 + r() * 0.45;          // strength of the secondary front (continuous)
    const og2x = og2[0], og2y = og2[1];

    // chaos amount + how sharply it ramps (some seeds barely mutiny, some fully)
    const chaosMax = 0.5 + r() * 0.95;        // overall disorder ceiling
    const ramp = 1.05 + r() * 2.7;            // how steep the order→chaos gradient is
    const accentChance = 0.07 + r() * 0.20;   // density of the lone accent unit(s)
    // chaos-field noise character — continuous freq + warp so the boundary is unique
    const nFreq = 2.0 + r() * 3.0;
    const nWarp = 0.4 + r() * 0.8;
    const nSeedX = r() * 40, nSeedY = r() * 40;
    // anisotropy: the gradient can stretch along one axis (directional mutiny)
    const aniso = 0.6 + r() * 0.9;
    const anisoAng = r() * Math.PI;
    const caX = Math.cos(anisoAng), saX = Math.sin(anisoAng);

    // chaos field: 0 (order) → 1 (full mutiny) as a fn of distance from origin(s)
    function chaosAt(u, v) {
      // anisotropic distance from primary origin
      let du = u - ogx, dv = v - ogy;
      const ru = du * caX + dv * saX, rv = -du * saX + dv * caX;
      const d = Math.hypot(ru * aniso, rv / aniso) / Math.SQRT2;
      let t = Math.pow(K.clamp(1 - d, 0, 1), ramp);
      // secondary lobe (additive, softer)
      const d2 = Math.hypot(u - og2x, v - og2y) / Math.SQRT2;
      const t2 = Math.pow(K.clamp(1 - d2, 0, 1), ramp * 1.3) * lobe2;
      t = Math.max(t, t2);
      // fbm so the boundary breathes, never a clean ring (unique freq/warp/offset per seed)
      const n = (noise.fbm(u * nFreq + nSeedX, v * nFreq + nSeedY, 4, 0.55, 2.1) + 1) / 2;
      t = K.clamp(t * (1 - nWarp * 0.5 + n * nWarp), 0, 1);
      return t * chaosMax;
    }

    // ── PAPER GROUND (warm, mottled, with a faint diagonal tooth gradient) ──
    const bgAng = r() * Math.PI * 2;           // tooth-gradient direction varies
    const bg = x.createLinearGradient(W / 2 - Math.cos(bgAng) * W, H / 2 - Math.sin(bgAng) * H, W / 2 + Math.cos(bgAng) * W, H / 2 + Math.sin(bgAng) * H);
    bg.addColorStop(0, pal.paper);
    bg.addColorStop(0.5 + (r() - 0.5) * 0.2, K.mix(pal.paper, pal.paper2, 0.5));
    bg.addColorStop(1, pal.paper2);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // broad uneven ink wash on the ordered (far-from-origin) side for value structure
    {
      const fx = (1 - ogx), fy = (1 - ogy);
      const wr = (0.7 + r() * 0.5);
      const gx = x.createRadialGradient(fx * W, fy * H, S * 0.05, fx * W, fy * H, S * wr);
      gx.addColorStop(0, K.rgba(pal.soft, 0.10 + r() * 0.12));
      gx.addColorStop(1, K.rgba(pal.soft, 0));
      x.fillStyle = gx; x.fillRect(0, 0, W, H);
    }
    K.mottle(x, 0, 0, W, H, pal.paper, 60, r, 'multiply');

    // ── COMPOSED MARGIN: per-side, wide & asymmetric. This shifts the focal block
    //    around the frame so two seeds never sit in the same place / same crop. ──
    const mL = S * (0.05 + r() * 0.14), mT = S * (0.05 + r() * 0.14);
    const mR = S * (0.05 + r() * 0.14), mB = S * (0.05 + r() * 0.14);
    const fx0 = mL, fy0 = mT, fW = W - mL - mR, fH = H - mT - mB;

    // ── GRID DENSITY / GLOBAL SCALE: continuous over a wide range, plus an
    //    independent per-axis stretch so cells aren't always square-ish. ──
    const densityBias = mode === 'Ruled Drift' ? 1.35 : (mode === 'Quiet Rotation' ? 0.5 : 1);
    const baseCells = Math.max(4, Math.round((6 + r() * 12) * densityBias)); // 4..~24 continuous
    const stretch = 0.78 + r() * 0.5;          // col:row aspect of the lattice
    const cols = baseCells, rows = Math.max(3, Math.round(baseCells * (fH / fW) * stretch));
    const cw = fW / cols, ch = fH / rows;
    const cell = Math.min(cw, ch);

    // global unit-fill ratio: how much of each cell a unit occupies (density of mark)
    const fillRatio = 0.50 + r() * 0.28;
    // global rotation-amplitude scalar (how violent the tilt gets at full chaos)
    const rotAmp = 0.7 + r() * 0.8;
    // global drift-amplitude scalar (how far units wander)
    const driftAmp = 0.7 + r() * 0.9;
    // global line-weight scalar
    const lwScale = 0.8 + r() * 0.6;
    // accent placement: one zone, usually riding the chaos front
    const accentBiasToChaos = r() < 0.7;
    const accThresh = 0.25 + r() * 0.25;

    // ── CROP / ZOOM + FOCAL PAN: a continuous viewport transform around the field.
    //    Some seeds pull in tight on the mutiny front, some sit back. Determinism kept. ──
    const zoom = 0.92 + r() * 0.42;            // 0.92 (slight pull-back) → 1.34 (crop in)
    const panX = (r() - 0.5) * (zoom - 1 + 0.06) * W * 1.1;
    const panY = (r() - 0.5) * (zoom - 1 + 0.06) * H * 1.1;
    // pivot the zoom near the chaos front so crops emphasise the disorder
    const pvx = ogx * W, pvy = ogy * H;

    x.save();
    x.translate(pvx + panX, pvy + panY);
    x.scale(zoom, zoom);
    x.translate(-pvx, -pvy);

    // ───────────────────────── MODE COMPOSITION ─────────────────────────
    if (mode === 'Tilt Cascade') {
      // each unit is a square outline that progressively ROTATES toward the origin
      const tiltMax = Math.PI * (0.6 + r() * 0.5) * rotAmp;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
          const cx = fx0 + (i + 0.5) * cw, cy = fy0 + (j + 0.5) * ch;
          const c = chaosAt(u, v);
          const ang = c * tiltMax * (r() < 0.5 ? 1 : 0.7) + (r() - 0.5) * c * 0.7;
          const drift = c * cell * 0.3 * driftAmp;
          const sz = cell * (fillRatio * (1 - c * 0.18) + (r() - 0.5) * 0.06);
          const isAccent = r() < accentChance && (accentBiasToChaos ? c > accThresh : c < accThresh);
          x.save();
          x.translate(cx + (r() - 0.5) * drift, cy + (r() - 0.5) * drift);
          x.rotate(ang);
          if (isAccent) {
            handFill(x, sz, sz * (0.9 + r() * 0.25), pal.accent, 0.88 + r() * 0.08, r);
          } else {
            const lw = cell * (0.03 + c * 0.022) * lwScale;
            handRect(x, sz, sz * (0.92 + r() * 0.18), lw, pal.ink, 0.84 - c * 0.12, r);
            // a few units near full chaos get a second nested, badly-aligned frame
            if (c > 0.5 && r() < 0.55) handRect(x, sz * (0.4 + r() * 0.3), sz * (0.4 + r() * 0.3), lw * 0.8, pal.ink, 0.6, r);
          }
          x.restore();
        }
      }

    } else if (mode === 'Broken Frames') {
      // nested concentric square FRAMES; in chaos, inner frames slip/rotate/escape
      const slipMax = (0.25 + r() * 0.3) * driftAmp;
      const nfMax = 1.6 + r() * 1.4;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
          const cx = fx0 + (i + 0.5) * cw, cy = fy0 + (j + 0.5) * ch;
          const c = chaosAt(u, v);
          // nested-frame COUNT scales with chaos: ordered cells = 1 clean frame,
          // chaos cells accumulate slipping inner frames → the gradient reads clearly
          const nf = 1 + Math.round(c * nfMax);
          const base = cell * (fillRatio + 0.18);
          const isAccentCell = r() < accentChance && (accentBiasToChaos ? c > accThresh + 0.1 : c < accThresh);
          for (let k = 0; k < nf; k++) {
            const fr = base * (1 - k / (nf + 0.4));
            // outer frame holds near-true; only inner frames slip/rotate (escape inward)
            const slipAmt = k === 0 ? c * 0.5 : 1;
            const slipX = c * cell * slipMax * (r() - 0.5) * (k + 1) * slipAmt;
            const slipY = c * cell * slipMax * (r() - 0.5) * (k + 1) * slipAmt;
            const rot = c * (Math.PI * 0.42) * (r() - 0.5) * (k + 1) * slipAmt * rotAmp;
            x.save();
            x.translate(cx + slipX, cy + slipY); x.rotate(rot);
            const useAccent = isAccentCell && k === (r() < 0.5 ? 0 : 1);
            const col = useAccent ? pal.accent : pal.ink;
            const lw = cell * (0.026 + (nf - k) * 0.006) * lwScale;
            if (useAccent && r() < 0.5) handFill(x, fr, fr * (0.92 + r() * 0.16), pal.accent, 0.85, r);
            else handRect(x, fr, fr * (0.94 + r() * 0.12), lw, col, 0.85 - c * 0.1, r);
            x.restore();
          }
        }
      }

    } else if (mode === 'Ruled Drift') {
      // a dense ruled LINE grid; lines stay parallel in order, buckle & cross in chaos
      const buckle = (1.0 + r() * 1.1);        // how far lines wander in chaos
      const hAlpha = 0.6 + r() * 0.18, vAlpha = 0.55 + r() * 0.18;
      // horizontal rules
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        const segs = cols * 2;
        x.beginPath();
        for (let s = 0; s <= segs; s++) {
          const u = s / segs;
          const c = chaosAt(u, v);
          const px = fx0 + u * fW;
          const py = fy0 + j * ch + (noise.fbm(u * 6 + j + nSeedX, v * 6 + nSeedY, 3)) * c * cell * buckle + (r() - 0.5) * c * cell * 0.4;
          if (s === 0) { x.moveTo(px, py); } else { x.lineTo(px, py); }
        }
        x.strokeStyle = K.rgba(pal.ink, hAlpha);
        x.lineWidth = cell * (0.04 + chaosAt(0.5, v) * 0.022) * lwScale;
        x.lineCap = 'round'; x.stroke();
      }
      // vertical rules
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const segs = rows * 2;
        x.beginPath();
        for (let s = 0; s <= segs; s++) {
          const v = s / segs;
          const c = chaosAt(u, v);
          const px = fx0 + i * cw + (noise.fbm(u * 6 + nSeedX, v * 6 + i + nSeedY, 3)) * c * cell * buckle + (r() - 0.5) * c * cell * 0.4;
          const py = fy0 + v * fH;
          if (s === 0) { x.moveTo(px, py); } else { x.lineTo(px, py); }
        }
        x.strokeStyle = K.rgba(pal.ink, vAlpha);
        x.lineWidth = cell * (0.036 + chaosAt(u, 0.5) * 0.022) * lwScale;
        x.lineCap = 'round'; x.stroke();
      }
      // one-to-few accent rules that defect across the grid (count + path vary)
      const defectors = 1 + (r() < 0.4 ? 1 : 0);
      for (let d = 0; d < defectors; d++) {
        const jj = K.rint(r, 1, rows - 1);
        const freq = 5 + r() * 7, ampMul = 0.9 + r() * 0.8, ph = r() * 6.28;
        x.beginPath();
        const segs = cols * 2;
        for (let s = 0; s <= segs; s++) {
          const u = s / segs; const v = jj / rows;
          const c = chaosAt(u, v);
          const px = fx0 + u * fW;
          const py = fy0 + jj * ch + Math.sin(u * freq + ph) * c * cell * ampMul;
          if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.strokeStyle = K.rgba(pal.accent, 0.88);
        x.lineWidth = cell * (0.055 + r() * 0.03) * lwScale; x.lineCap = 'round'; x.stroke();
      }

    } else if (mode === 'Fracture Zone') {
      // ordered solid-ink squares everywhere; toward origin they SHATTER into shards
      const crackLo = 0.2 + r() * 0.16, crackHi = 0.5 + r() * 0.2;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
          const cx = fx0 + (i + 0.5) * cw, cy = fy0 + (j + 0.5) * ch;
          const c = chaosAt(u, v);
          const sz = cell * (fillRatio + 0.1 + (r() - 0.5) * 0.06);
          const isAccent = r() < accentChance && c > accThresh;
          const col = isAccent ? pal.accent : pal.ink;
          x.save();
          x.translate(cx, cy);
          if (c < crackLo) {
            // intact open frame
            handRect(x, sz, sz * (0.94 + r() * 0.12), cell * 0.05 * lwScale, col, 0.85, r);
          } else if (c < crackHi) {
            // cracking: frame + a diagonal split line + slight offset corner
            handRect(x, sz, sz, cell * 0.05 * lwScale, col, 0.8, r);
            handLine(x, -sz / 2, -sz / 2 + sz * r(), sz / 2, -sz / 2 + sz * r(), cell * 0.05 * lwScale, col, 0.8, r);
          } else {
            // shattered: several rotated shards flying toward origin
            const shards = 3 + (r() * 4 | 0);
            for (let s = 0; s < shards; s++) {
              const dist = c * cell * (0.4 + r() * 0.35) * driftAmp * r();
              const dir = Math.atan2(ogy - v, ogx - u) + (r() - 0.5) * 1.6;
              x.save();
              x.translate(Math.cos(dir) * dist, Math.sin(dir) * dist);
              x.rotate((r() - 0.5) * Math.PI * rotAmp);
              const shw = sz * (0.18 + r() * 0.4), shh = sz * (0.08 + r() * 0.32);
              if (s === 0 && isAccent) handFill(x, shw, shh, pal.accent, 0.9, r);
              else handFill(x, shw, shh, col, 0.76 + r() * 0.12, r, 2);
              x.restore();
            }
          }
          x.restore();
        }
      }

    } else if (mode === 'Quiet Rotation') {
      // sparse, large rotated squares on a clear field — minimal, the most negative-space
      const big = Math.max(4, Math.round(baseCells * (0.5 + r() * 0.25)));
      const bcols = big, brows = Math.max(3, Math.round(big * (fH / fW) * stretch));
      const bcw = fW / bcols, bch = fH / brows;
      const bcell = Math.min(bcw, bch);
      const skipChance = 0.25 + r() * 0.35;     // how much breathing room
      const bigSz = 0.46 + r() * 0.16;
      for (let j = 0; j < brows; j++) {
        for (let i = 0; i < bcols; i++) {
          const u = (i + 0.5) / bcols, v = (j + 0.5) / brows;
          const cx = fx0 + (i + 0.5) * bcw, cy = fy0 + (j + 0.5) * bch;
          const c = chaosAt(u, v);
          // skip some cells in the ordered zone for breathing room
          if (c < 0.3 && r() < skipChance) continue;
          const ang = (Math.PI / 4) * c * rotAmp + (r() - 0.5) * c * 0.9;
          const sz = bcell * (bigSz + c * 0.2 + (r() - 0.5) * 0.06);
          const isAccent = r() < accentChance * 1.4 && (accentBiasToChaos ? c > accThresh : c < accThresh);
          x.save();
          x.translate(cx + (r() - 0.5) * c * bcell * 0.32 * driftAmp, cy + (r() - 0.5) * c * bcell * 0.32 * driftAmp);
          x.rotate(ang);
          if (isAccent) handFill(x, sz, sz * (0.9 + r() * 0.2), pal.accent, 0.88, r);
          else {
            handRect(x, sz, sz * (0.92 + r() * 0.16), bcell * 0.055 * lwScale, pal.ink, 0.85, r);
            if (r() < 0.45) handFill(x, sz * (0.14 + r() * 0.1), sz * (0.14 + r() * 0.1), pal.ink, 0.55, r); // a quiet centre dot
          }
          x.restore();
        }
      }

    } else { // Defector Grid
      // perfect grid of small solid squares; a growing fraction near origin DEFECT —
      // drift out of slot, rotate, turn accent — the mutiny made literal
      const defectAccent = 0.28 + r() * 0.3;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
          const cx = fx0 + (i + 0.5) * cw, cy = fy0 + (j + 0.5) * ch;
          const c = chaosAt(u, v);
          const defect = r() < c;            // probability of defection rises with chaos
          const sz = cell * (fillRatio - 0.02 + (r() - 0.5) * 0.05);
          x.save();
          if (defect) {
            const dx = (r() - 0.5) * cell * 0.72 * c * driftAmp, dy = (r() - 0.5) * cell * 0.72 * c * driftAmp;
            x.translate(cx + dx, cy + dy);
            x.rotate((r() - 0.5) * Math.PI * c * rotAmp);
            const accent = r() < defectAccent;
            if (accent) handFill(x, sz * (0.8 + r() * 0.5), sz * (0.8 + r() * 0.5), pal.accent, 0.9, r);
            else handRect(x, sz * (0.9 + r() * 0.4), sz * (0.9 + r() * 0.4), cell * 0.045 * lwScale, pal.ink, 0.82, r);
          } else {
            x.translate(cx, cy);
            handFill(x, sz, sz * (0.96 + r() * 0.08), pal.ink, 0.86, r, 1);
          }
          x.restore();
        }
      }
    }

    x.restore();

    // ── a faint registration tick frame (concrete-art print feel), composed margin cue ──
    if (r() < 0.65) {
      x.save();
      const tk = S * (0.014 + r() * 0.01);
      x.strokeStyle = K.rgba(pal.ink, 0.30); x.lineWidth = 1.2; x.lineCap = 'round';
      const corners = [[fx0, fy0, 1, 1], [fx0 + fW, fy0, -1, 1], [fx0, fy0 + fH, 1, -1], [fx0 + fW, fy0 + fH, -1, -1]];
      for (const [px, py, sx, sy] of corners) {
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + sx * tk, py); x.stroke();
        x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + sy * tk); x.stroke();
      }
      x.restore();
    }

    // ───────────────────────── SURFACE GRADE ─────────────────────────
    // printed-ink mottle over the whole field for tactile screenprint tooth
    K.mottle(x, 0, 0, W, H, pal.ink, 80, r, 'soft-light');
    // a warmer paper-fibre mottle to give the cream stock visible tooth
    K.mottle(x, 0, 0, W, H, pal.soft, 95, r, 'multiply');
    // whisper of haze — warm paper light, faint, breaks vector flatness
    const hazeCol = K.mix(pal.paper, '#ffffff', 0.5);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.13, S * 0.8, 'soft-light');
    // a second, cooler haze pull from the ordered corner for depth
    {
      const fxc = (1 - ogx) * W, fyc = (1 - ogy) * H;
      K.bloom(x, fxc, fyc, S * 0.7, K.mix(pal.paper, '#ffffff', 0.7), 0.06);
    }
    // paper grain
    K.grain(x, W, H, 4.2, r);
    // vignette — restrained, slightly warm-dark at edges
    K.vignette(x, W, H, basePal.rare ? 0.30 : 0.26);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const basePal = pickPal(r);
    jitterPal(basePal, r); // consume same rng draws as draw() (5 jitter calls' worth)
    const mode = K.pick(MODES, r);
    const aspect = 0.74 + r() * 0.74;
    const f = aspect > 1.08 ? 'Landscape' : aspect < 0.92 ? 'Portrait' : 'Square';
    // mirror draw()'s rng order beyond format to report origin + mutiny
    r();                                       // longEdge
    const edge = r();
    function edgePoint(t) {
      const p = t * 4; let u, v;
      if (p < 1) { u = p; v = 0; } else if (p < 2) { u = 1; v = p - 1; }
      else if (p < 3) { u = 3 - p; v = 1; } else { u = 0; v = 4 - p; }
      return [u, v];
    }
    const og0 = edgePoint(edge);
    const inward = r() * 0.22;
    const ogx = og0[0] + (0.5 - og0[0]) * inward;
    const ogy = og0[1] + (0.5 - og0[1]) * inward;
    r(); r();                                  // og2 edge-walk draw, lobe2 (edgePoint reads no rng)
    const chaosMax = 0.5 + r() * 0.95;
    // name the origin by nearest cardinal/corner region (continuous → label)
    const nx = ogx < 0.34 ? 'W' : ogx > 0.66 ? 'E' : '';
    const ny = ogy < 0.34 ? 'N' : ogy > 0.66 ? 'S' : '';
    const origin = (ny + nx) || 'C';
    const mutiny = chaosMax < 0.8 ? 'Faint' : chaosMax < 1.15 ? 'Rising' : 'Full';
    return { Palette: basePal.name, Mode: mode, Format: f, Origin: origin, Mutiny: mutiny };
  }

  return { name: 'b_mutiny', draw, traits };
})();
