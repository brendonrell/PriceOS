/* DRAPERY — a classical drapery study, made uncanny.
 * Soft cloth / paper folds and shadow, rendered painterly and tonal:
 * Renaissance drapery studies, Christo's wrapped voids, Hammershoi calm.
 * SURREAL = real-but-off: the cloth covers a form that is WRONG or ABSENT —
 * a shroud holding a volume that isn't there, folds that defy gravity, a
 * silhouette that can't belong to any real object underneath.
 * Tonal/material palette world: linen, ash, indigo velvet, dusty rose silk,
 * sepia paper, oxblood drape. Raking light sculpts; deep soft valley shadow.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Tonal/material cloth palettes. Each: bg (the calm ground wall),
     base (mid cloth tone), hi (raking highlight on lit ridges),
     core (the core shadow inside a fold), deep (the deep valley occlusion),
     sheen (the specular catch — strong on satin, dim on linen),
     ink (darkest), mat = material character. */
  const PALS = [
    { name: 'Plaster', bg: '#c9c0b1', base: '#d9d1c2', hi: '#f1ece0', core: '#9a8f7d', deep: '#6c6051', sheen: '#fbf7ec', ink: '#3f382d', mat: 'linen' },
    { name: 'Ash',     bg: '#b7b8ba', base: '#c6c8ca', hi: '#eceef0', core: '#8a8c90', deep: '#5b5d62', sheen: '#f6f8fa', ink: '#2e3034', mat: 'linen' },
    { name: 'Indigo',  bg: '#2d3550', base: '#3a4straightplaceholder', hi: '#9fb0d6', core: '#222a44', deep: '#141a30', sheen: '#cfe0ff', ink: '#0b0f1e', mat: 'velvet' },
    { name: 'Rose',    bg: '#b89a92', base: '#cbab9f', hi: '#f0d8c8', core: '#9a766c', deep: '#6f4f49', sheen: '#fbe6d6', ink: '#3e2a27', mat: 'silk' },
    { name: 'Bistre',  bg: '#a48d6c', base: '#b69b75', hi: '#e3cca0', core: '#7d6346', deep: '#54402a', sheen: '#f3e0bc', ink: '#332512', mat: 'paper' },
    { name: 'Oxblood', bg: '#5a302e', base: '#6e3a37', hi: '#b66a5c', core: '#451e1d', deep: '#260f10', sheen: '#e6a48c', ink: '#160708', mat: 'velvet' },
  ];
  // fix the indigo base typo programmatically below — keep palette literal clean:
  PALS[2].base = '#3a4566';

  const MODES = ['Shroud', 'Folds', 'Caught', 'Pooled', 'Veil', 'Knot'];
  const FORMATS = [[1040, 1300], [1180, 1180], [1300, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  // material → how the fold cross-section reads + sheen strength
  function matProps(mat) {
    if (mat === 'satin' || mat === 'silk') return { sheen: 0.55, contrast: 1.15, crush: 0.0 };
    if (mat === 'velvet') return { sheen: 0.30, contrast: 1.35, crush: 0.45 };
    if (mat === 'paper') return { sheen: 0.12, contrast: 1.05, crush: 0.0 };
    return { sheen: 0.14, contrast: 0.95, crush: 0.0 }; // linen — matte
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 23);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const mp = matProps(pal.mat);

    // raking light: a clear direction (mostly from upper-left or upper-right)
    const lightSide = r() < 0.5 ? -1 : 1;     // -1 = light from left
    const lightAng = lightSide * (0.35 + r() * 0.25); // radians off vertical-ish

    // ── CALM GROUND (the wall/backdrop, a soft tonal gradient) ──
    (function ground() {
      const g = x.createLinearGradient(0, 0, lightSide * W * 0.4, H);
      g.addColorStop(0, K.mix(pal.bg, pal.hi, 0.10));
      g.addColorStop(0.55, pal.bg);
      g.addColorStop(1, K.mix(pal.bg, pal.deep, 0.45));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // very soft large-scale mottle on the wall so it isn't dead-flat
      K.mottle(x, 0, 0, W, H, pal.bg, 40, r, 'overlay');
    })();

    /* ── CORE PRIMITIVE: a single soft fabric fold ───────────────────────────
       A fold is a vertical-ish ribbon following a wandering centre-line.
       Cross-section (perpendicular): from one valley edge → lit ridge → core
       shadow → other valley. We paint it as a sequence of thin trapezoid
       slabs down the length, each shaded by a 1-D cross-section gradient.
       cx(t): centre x at length-param t in [0,1]
       half(t): half-width of the fold at t
       lit: the side (–1/1) the raking light catches (the ridge highlight)   */
    function paintFold(x0, x1, y0, y1, baseHalf, wob, phase, lit, depth, alpha) {
      const STEPS = 46;
      // precompute centre-line + widths
      const cxs = [], hws = [];
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const px = x0 + (x1 - x0) * t;
        const py = y0 + (y1 - y0) * t;
        // centre wanders via fbm — gives the cloth its organic drift
        const drift = noise.fbm(px / (W * 0.5) + phase, py / (H * 0.5), 4, 0.55, 2.1);
        const cx = px + drift * wob;
        // width breathes — folds pinch and swell
        const swell = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * Math.PI * (1 + phase * 0.3) + phase * 6));
        const wn = noise.fbm(px / (W * 0.3), py / (H * 0.3) + phase * 2, 3) * 0.3;
        // blunt-ended taper: keep body through the fold, soften only the very tips
        const endTaper = 0.62 + 0.38 * Math.pow(Math.sin(t * Math.PI), 0.45);
        const hw = baseHalf * (swell + wn) * endTaper;
        cxs.push(cx); hws.push(Math.max(2, hw));
      }
      // paint cross-section bands as long thin polygons running down the fold.
      // bands across the half-width: valleyFar | occl | core | ridge-base | RIDGE(lit) | falloff | valleyNear
      // We sweep an offset u from -1..1 (lit side positive when u*lit>0).
      const BANDS = 9;
      for (let b = 0; b < BANDS; b++) {
        const u0 = -1 + (2 * b) / BANDS;
        const u1 = -1 + (2 * (b + 1)) / BANDS;
        const um = (u0 + u1) / 2;
        // shading model across the fold: lit ridge near the lit edge, core
        // shadow on the shaded flank, soft occlusion at both valley edges.
        const litness = (um * lit + 1) / 2;            // 0 shaded flank → 1 lit flank
        // curvature term: ridge sits around um ~ 0.15*lit (just past centre toward light)
        const ridgePos = 0.18 * lit;
        const ridge = Math.exp(-Math.pow((um - ridgePos) * 2.4, 2)); // bright lobe
        const valley = Math.pow(Math.abs(um), 3.0);    // dark at outer edges
        // compose a tone
        let tone;
        const litMix = Math.pow(litness, 0.8);
        tone = K.mix(pal.core, pal.base, litMix);
        tone = K.mix(tone, pal.hi, ridge * 0.85 * mp.contrast * litMix);
        tone = K.mix(tone, pal.deep, valley * 0.7);
        // velvet crush: darken the lit flanks slightly + deepen core (sheen at grazing)
        if (mp.crush > 0) tone = K.mix(tone, pal.deep, (1 - ridge) * mp.crush * 0.3);

        x.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const px = cxs[i] + hws[i] * u0;
          const py = y0 + (y1 - y0) * (i / STEPS);
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        for (let i = STEPS; i >= 0; i--) {
          const px = cxs[i] + hws[i] * u1;
          const py = y0 + (y1 - y0) * (i / STEPS);
          x.lineTo(px, py);
        }
        x.closePath();
        x.globalAlpha = alpha;
        x.fillStyle = tone;
        x.fill();
        x.globalAlpha = 1;
      }
      // specular sheen streak along the ridge (satin/silk catches; linen barely)
      if (mp.sheen > 0.16) {
        x.save();
        x.globalCompositeOperation = 'screen';
        x.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const px = cxs[i] + hws[i] * (0.18 * lit);
          const py = y0 + (y1 - y0) * (i / STEPS);
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.lineWidth = baseHalf * 0.22;
        x.lineCap = 'round';
        const taper = x.createLinearGradient(x0, y0, x1, y1);
        taper.addColorStop(0, K.rgba(pal.sheen, 0));
        taper.addColorStop(0.5, K.rgba(pal.sheen, mp.sheen * 0.5 * alpha));
        taper.addColorStop(1, K.rgba(pal.sheen, 0));
        x.strokeStyle = taper;
        x.stroke();
        x.restore();
      }
      return cxs; // return centre-line for contact-shadow use
    }

    // soft contact/cast shadow on the ground beneath a draped mass
    function castShadow(cx, cy, rx, ry, a) {
      x.save();
      x.globalCompositeOperation = 'multiply';
      const off = lightSide * rx * 0.45;
      const g = x.createRadialGradient(cx - off, cy, ry * 0.2, cx - off, cy, rx);
      g.addColorStop(0, K.rgba(pal.ink, a));
      g.addColorStop(0.6, K.rgba(pal.ink, a * 0.4));
      g.addColorStop(1, K.rgba(pal.ink, 0));
      x.translate(cx - off, cy); x.scale(1, ry / rx); x.translate(-(cx - off), -cy);
      x.fillStyle = g; x.beginPath(); x.arc(cx - off, cy, rx, 0, 7); x.fill();
      x.restore();
    }

    // a curtain/cascade of vertical folds filling a region
    function curtain(rx0, rx1, ry0, ry1, count, wob, lengthJit) {
      const folds = [];
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const fx = rx0 + (rx1 - rx0) * t;
        const half = ((rx1 - rx0) / count) * (0.62 + r() * 0.5);
        const ph = r() * 10;
        const lit = r() < 0.62 ? lightSide : -lightSide; // most catch the rake; some shaded
        const top = ry0 + (ry0 - ry1 > 0 ? 0 : 0) + (r() - 0.5) * 20;
        const bot = ry1 + (r() - 0.5) * 40 * lengthJit;
        folds.push({ fx, half, ph, lit, top, bot, x1: fx + (r() - 0.5) * wob * 0.6 });
      }
      // paint back-to-front by depth jitter so overlaps read as layered cloth
      folds.sort((a, b) => a.half - b.half);
      for (const f of folds) {
        paintFold(f.fx, f.x1, f.top, f.bot, f.half, wob, f.ph, f.lit, 1, 0.92 + r() * 0.08);
      }
    }

    // ── COMPOSE PER MODE ──
    const cxImpl = W * 0.5;

    if (mode === 'Folds') {
      // frame-filling cascade of vertical folds, raking light
      castShadow(W * 0.5, H * 0.92, W * 0.5, H * 0.10, 0.45);
      const n = 9 + (r() * 5 | 0);
      curtain(-W * 0.04, W * 1.04, H * (-0.06), H * 1.06, n, W * 0.09, 1.1);

    } else if (mode === 'Shroud') {
      // THE SURREAL STAR: cloth draped over an absent/impossible volume.
      // Build a rounded mass of folds with a clear silhouette, but the implied
      // form is wrong — a tall narrow peak + a hollow, a shape no object fits.
      const baseY = H * (0.78 + r() * 0.08);
      const peakX = W * (0.40 + r() * 0.20);
      const peakY = H * (0.16 + r() * 0.12);
      const massW = W * (0.46 + r() * 0.16);
      castShadow(peakX + lightSide * W * 0.04, baseY + H * 0.02, massW * 0.95, H * 0.07, 0.5);

      // radiating folds from the peak down to the base — like cloth pulled to a point
      const n = 11 + (r() * 6 | 0);
      const ribs = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        // base spread across the floor footprint
        const bx = peakX + (t - 0.5) * massW * (1.0 + 0.3 * Math.sin(t * 7));
        const by = baseY + (r() - 0.5) * H * 0.05;
        // top converges near peak but with a slight wrong twist (impossible pinch)
        const tx = peakX + (t - 0.5) * massW * 0.10 + Math.sin(t * 5 + 1) * W * 0.03;
        const ty = peakY + Math.abs(t - 0.5) * H * 0.08;
        const half = massW / n * (0.7 + r() * 0.6);
        const lit = ((bx - peakX) * lightSide < 0) ? lightSide : -lightSide;
        ribs.push({ tx, ty, bx, by, half, ph: r() * 10, lit, depth: Math.abs(t - 0.5) });
      }
      ribs.sort((a, b) => b.depth - a.depth); // outer/back first
      for (const f of ribs) paintFold(f.tx, f.bx, f.ty, f.by, f.half, W * 0.06, f.ph, f.lit, 1, 0.95);
      // a fuller pooled hem at the base so the cloth reaches the floor as cloth,
      // not stringy legs — short blunt horizontal folds bunched along the footprint
      const hemN = 6 + (r() * 3 | 0);
      for (let i = 0; i < hemN; i++) {
        const t = (i + 0.5) / hemN;
        const hx = peakX + (t - 0.5) * massW * 1.05;
        const hw = massW / hemN * (0.9 + r() * 0.5);
        paintFold(hx - hw, hx + hw, baseY - H * 0.04 + (r() - 0.5) * H * 0.03,
                  baseY + (r() - 0.5) * H * 0.02, hw * 0.6, W * 0.03, r() * 10, lightSide, 1, 0.95);
      }
      // the "wrong" hollow: a dark concavity where a head/solid should be — a void
      x.save(); x.globalCompositeOperation = 'multiply';
      const hv = x.createRadialGradient(peakX + lightSide * massW * 0.10, peakY + H * 0.10, 4,
        peakX + lightSide * massW * 0.10, peakY + H * 0.10, massW * 0.22);
      hv.addColorStop(0, K.rgba(pal.deep, 0.65)); hv.addColorStop(1, K.rgba(pal.deep, 0));
      x.fillStyle = hv; x.fillRect(0, 0, W, H); x.restore();

    } else if (mode === 'Caught') {
      // cloth frozen mid-air / mid-wind, defying gravity — a SHEET billowing
      // sideways across the frame, its folds running roughly horizontal, lifted
      // up at one corner as if a gust froze. Wrong gravity: it hangs from nothing.
      castShadow(W * 0.5, H * 0.95, W * 0.42, H * 0.05, 0.18); // faint — airborne
      const flow = lightSide;                 // wind blows toward the lit side
      const cy = H * (0.46 + (r() - 0.5) * 0.16);
      const billow = H * (0.16 + r() * 0.08); // vertical swell amplitude
      const n = 9 + (r() * 4 | 0);
      const folds = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;              // 0..1 across the vertical stack of folds
        // each fold is a long horizontal ribbon arcing across the frame, with the
        // downwind corner LIFTED upward (defying gravity)
        const yBase = cy + (t - 0.5) * billow * 1.7;
        const x0 = W * (-0.08);
        const x1 = W * (1.08);
        const y0 = yBase + Math.sin(t * 3 + 0.4) * H * 0.04;
        const y1 = yBase - billow * (0.4 + 0.5 * t) * flow * flow - H * 0.10; // lifted up at far edge
        const half = H * 0.05 * (0.8 + r() * 0.7);
        const lit = (t < 0.5) ? lightSide : -lightSide; // upper folds catch, lower in shade
        folds.push({ tx: flow < 0 ? x1 : x0, ty: flow < 0 ? y1 : y0,
                     bx: flow < 0 ? x0 : x1, by: flow < 0 ? y0 : y1,
                     half, ph: r() * 10, lit, d: t });
      }
      folds.sort((a, b) => a.d - b.d); // back (top) to front (bottom)
      for (const f of folds) paintFold(f.tx, f.bx, f.ty, f.by, f.half, W * 0.05, f.ph, f.lit, 1, 0.93);
      // a trailing wisp + edge flutter so it reads as airborne fabric, not a slab
      x.save(); x.globalCompositeOperation = 'multiply';
      K.softShadow(x, flow < 0 ? W * 0.12 : W * 0.88, cy + billow, W * 0.20, 0.25);
      x.restore();

    } else if (mode === 'Pooled') {
      // fabric pooling/puddling on a surface — concentric collapsing folds low
      const surfY = H * (0.58 + r() * 0.1);
      // a tablecloth-ish drop from above into a pool
      castShadow(W * 0.5, surfY + H * 0.16, W * 0.46, H * 0.08, 0.5);
      // upper hanging part
      const n1 = 7 + (r() * 3 | 0);
      curtain(W * 0.18, W * 0.82, -H * 0.04, surfY, n1, W * 0.06, 0.4);
      // pooled rings — flattened, wide, stacked
      const cx = W * (0.5 + (r() - 0.5) * 0.1);
      const rings = 5 + (r() * 3 | 0);
      for (let i = rings; i >= 0; i--) {
        const t = i / rings;
        const ry = surfY + (H - surfY) * (0.15 + t * 0.6);
        const rw = W * (0.16 + t * 0.30);
        const ph = r() * 10;
        const lit = lightSide;
        // a horizontal pooled fold: short, wide, low arc
        paintFold(cx - rw, cx + rw, ry, ry + (r() - 0.5) * 20, rw * 0.5, W * 0.03, ph, lit, 1, 0.92);
      }

    } else if (mode === 'Veil') {
      // translucent layered veils, soft — several wide low-opacity sheets
      const layers = 4 + (r() * 3 | 0);
      for (let L = 0; L < layers; L++) {
        const t = L / layers;
        const yo = H * (0.05 + t * 0.18) + (r() - 0.5) * H * 0.06;
        const n = 5 + (r() * 3 | 0);
        const alpha = 0.30 + t * 0.16;
        // wide gentle folds, low contrast — soft sheet
        for (let i = 0; i < n; i++) {
          const tt = (i + 0.5) / n;
          const fx = W * (0.06 + tt * 0.88) + (r() - 0.5) * W * 0.04;
          const half = W * 0.12 * (0.7 + r() * 0.6);
          const lit = r() < 0.5 ? lightSide : -lightSide;
          paintFold(fx, fx + (r() - 0.5) * W * 0.05, yo, H * (0.96), half, W * 0.10, r() * 10, lit, 1, alpha);
        }
      }
      // breathe a hazy translucency over it
      K.hazeSheet(x, W, H, noise, K.mix(pal.bg, pal.hi, 0.5), 0.20, Math.min(W, H) * 0.7, 'screen');

    } else { // Knot — a twisted/tied/wrung form
      const cx = W * (0.5 + (r() - 0.5) * 0.12);
      const cy = H * (0.5 + (r() - 0.5) * 0.10);
      castShadow(cx, cy + H * 0.22, W * 0.34, H * 0.07, 0.5);
      // two interlocking bundles wringing through the centre
      const strands = 6 + (r() * 3 | 0);
      const folds = [];
      for (let s = 0; s < strands; s++) {
        const a0 = (s / strands) * Math.PI + r() * 0.4;
        const reach = H * (0.28 + r() * 0.12);
        // S-curve through the knot: top out one side, twist through centre, bottom other side
        const tx = cx + Math.cos(a0) * reach;
        const ty = cy - reach * 0.8 + (r() - 0.5) * H * 0.06;
        const bx = cx - Math.cos(a0) * reach * 0.8;
        const by = cy + reach * 0.9 + (r() - 0.5) * H * 0.06;
        const half = W * 0.10 * (0.85 + r() * 0.5);
        const lit = (Math.cos(a0) * lightSide > 0) ? lightSide : -lightSide;
        folds.push({ tx, ty, bx, by, half, ph: r() * 10, lit, d: s });
      }
      // alternate draw order to interleave (over/under weave illusion)
      for (const f of folds) paintFold(f.tx, f.bx, f.ty, f.by, f.half, W * 0.10, f.ph, f.lit, 1, 0.96);
      // tight core occlusion at the knot centre
      K.softShadow(x, cx, cy, W * 0.16, 0.5);
    }

    // ── MATERIAL TEXTURE PASS ──
    // subtle weave/surface for the cloth: matte mottle (linen/paper) or fine
    if (pal.mat === 'velvet') {
      // velvet: deep crush — a soft dark mottle that pools in valleys
      K.mottle(x, 0, 0, W, H, pal.deep, 30, r, 'multiply');
    } else if (pal.mat === 'paper') {
      K.mottle(x, 0, 0, W, H, pal.base, 22, r, 'overlay');
    } else {
      K.mottle(x, 0, 0, W, H, pal.base, 28, r, 'soft-light');
    }

    // a faint global sheen lobe where the raking light is strongest
    const lx = lightSide < 0 ? W * 0.22 : W * 0.78;
    K.sheen(x, lx, H * 0.30, Math.min(W, H) * 0.7, pal.sheen, mp.sheen * 0.16);

    // ── ATMOSPHERE & GRADE ──
    const hazeCol = K.mix(pal.bg, pal.hi, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, pal.mat === 'velvet' ? 0.10 : 0.16, Math.min(W, H) * 0.95, 'screen');
    // tonal floor haze for atmospheric recession
    const fh = x.createLinearGradient(0, H * 0.6, 0, H);
    fh.addColorStop(0, K.rgba(K.mix(pal.bg, pal.deep, 0.5), 0));
    fh.addColorStop(1, K.rgba(K.mix(pal.bg, pal.deep, 0.5), 0.28));
    x.fillStyle = fh; x.fillRect(0, H * 0.6, W, H * 0.4);

    K.grain(x, W, H, 5.5, r);
    K.vignette(x, W, H, lum(pal.bg) < 0.3 ? 0.5 : 0.34);

    return { aspect: W / H };

    function lum(h) { return K.lum(h); }
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const matMap = { Plaster: 'Linen', Ash: 'Linen', Indigo: 'Velvet', Rose: 'Silk', Bistre: 'Paper', Oxblood: 'Velvet' };
    return { Palette: pal.name, Mode: mode, Format: f, Material: matMap[pal.name] };
  }

  return { name: 's13_drape', draw, traits };
})();
