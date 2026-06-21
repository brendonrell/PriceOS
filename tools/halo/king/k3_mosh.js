/* K3 — MOSH : bright datamosh / glitch color planes + pixel-sort.
 * Joyful candy-saturated glitch as ABSTRACT PAINTING, never a hacker terminal.
 * Torn saturated color planes melt/ghost across boundaries (datamosh shear),
 * luminous pixel-sort streaks read as combed silk, controlled RGB split at
 * focal edges, interference/moiré beat into soft rainbow — all on a BRIGHT
 * holographic ground. Asymmetric: a heavily-moshed worked region balanced
 * against a clean bright flat field with active negative space.
 *
 * Aesthetic bible: bright cyberpunk, Promare + Heike silk + holo foil.
 * NO dark/terminal grounds. Ground is always a COLOR (~40-55% of frame).
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // Bright colorways. ground = dominant atmosphere (always luminous);
  // field = secondary mass; mid = body; accent = electric pop; hi = bloom/foil.
  const PALS = [
    { name: 'Cyber Sorbet',     ground: '#ff71ce', field: '#01cdfe', mid: '#05ffa1', accent: '#b967ff', hi: '#fffb96' },
    { name: 'Edgerunner Bright',ground: '#ff2e88', field: '#00e0ff', mid: '#8a4dff', accent: '#caff39', hi: '#ffffff' },
    { name: 'Acid Bloom',       ground: '#c2ff3d', field: '#ff2bd6', mid: '#39ff85', accent: '#7c4dff', hi: '#f6ffd6' },
    { name: 'Fuchsia Storm',    ground: '#e93479', field: '#2f5ddb', mid: '#f62e97', accent: '#f9ac53', hi: '#ffd9ec' },
    { name: 'Prism Spectrum',   ground: '#ff7ad9', field: '#7af0ff', mid: '#b6ff6e', accent: '#ffb14d', hi: '#ffffff', accent2: '#8c7bff' },
    { name: 'Tangerine Dusk',   ground: '#ff8a3d', field: '#a05cff', mid: '#ff5ea8', accent: '#ffe14d', hi: '#fff0d6' },
    { name: 'Mint Coral',       ground: '#8df0c8', field: '#ff7a85', mid: '#5cc8ff', accent: '#ffd166', hi: '#fdfbe9' },
    { name: 'Peachy Hologram',  ground: '#80e8dd', field: '#f9c1a0', mid: '#af81e4', accent: '#e784ba', hi: '#b7f6af' },
  ];

  // Varied aspect — square is the minority.
  const FMTS = [
    { W: 880, H: 1100, t: 'Portrait 4:5' },
    { W: 740, H: 1100, t: 'Portrait 2:3' },
    { W: 1100, H: 734, t: 'Landscape 3:2' },
    { W: 1100, H: 620, t: 'Cinema 16:9' },
    { W: 880, H: 1100, t: 'Portrait 4:5' },
    { W: 1100, H: 734, t: 'Landscape 3:2' },
    { W: 980, H: 980, t: 'Square 1:1' },
  ];

  const FLOWS = ['Vertical Silk', 'Horizontal Drag', 'Diagonal Shear'];
  const DENS  = ['Sparse', 'Worked', 'Dense'];
  const MOIRE = ['None', 'None', 'Soft Bands', 'Rainbow Beat'];
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','None','Total Collapse','Perfect Sort','Total Collapse'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt   = K.pick(FMTS, r);
    const flow  = K.pick(FLOWS, r);
    const dens  = K.pick(DENS, r);
    const moire = K.pick(MOIRE, r);
    const event = K.pick(EVENTS, r);
    // which corner/third the worked region anchors to (asymmetry driver)
    const anchorX = r() < 0.5 ? 'L' : 'R';
    const anchorY = r() < 0.5 ? 'T' : 'B';
    return { pal, fmt, flow, dens, moire, event, anchorX, anchorY };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Flow: p.flow,
      Density: p.dens,
      Interference: p.moire,
      Event: p.event === 'None' ? 'Standard' : p.event,
    };
  }

  // ---- helpers ---------------------------------------------------------------

  // rotate the role palette so we get many feels per colorway without dulling
  function roles(P, r) {
    const base = [P.ground, P.field, P.mid, P.accent, P.hi];
    if (P.accent2) base.splice(4, 0, P.accent2);
    return base;
  }

  // a torn saturated color plane — a bold flat block with a ragged edge that
  // will later be melted by the datamosh shear pass.
  function tornPlane(x, P, pal, r, x0, y0, w, h, col, ragAmt) {
    x.save();
    x.beginPath();
    const steps = 7 + (r() * 6 | 0);
    // ragged right edge (the "tear" the mosh ghosts across)
    x.moveTo(x0, y0);
    x.lineTo(x0 + w, y0);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const rag = (r() - 0.5) * w * ragAmt;
      x.lineTo(x0 + w + rag, y0 + t * h);
    }
    x.lineTo(x0, y0 + h);
    x.closePath();
    x.fillStyle = col;
    x.globalAlpha = 0.86 + r() * 0.14;
    x.fill();
    x.restore();
  }

  // ---- pixel passes (bounded for speed) -------------------------------------

  // PIXEL SORT: within a vertical or horizontal band, sort runs of pixels by
  // luminance between bright/dark thresholds → luminous combed-silk streaks.
  function pixelSort(x, W, H, opts) {
    const { x0, y0, w, h, vertical, thr, intensity } = opts;
    let img;
    try { img = x.getImageData(x0, y0, w, h); } catch (e) { return; }
    const d = img.data;
    const lumAt = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const lines = vertical ? w : h;
    const len = vertical ? h : w;
    for (let l = 0; l < lines; l++) {
      if (Math.random() > intensity && false) continue; // determinism kept by caller via thr jitter
      // collect indices of the line
      const idxs = new Array(len);
      for (let p = 0; p < len; p++) {
        idxs[p] = vertical ? (p * w + l) * 4 : (l * w + p) * 4;
      }
      // sort contiguous spans whose luminance lies in the active band
      let p = 0;
      while (p < len) {
        // find span start
        while (p < len && lumAt(idxs[p]) < thr.lo) p++;
        const start = p;
        while (p < len && lumAt(idxs[p]) >= thr.lo && lumAt(idxs[p]) <= thr.hi) p++;
        const end = p;
        if (end - start > 6) {
          const span = [];
          for (let q = start; q < end; q++) {
            const i = idxs[q];
            span.push([d[i], d[i + 1], d[i + 2], d[i + 3], lumAt(i)]);
          }
          span.sort((a, b) => a[4] - b[4]);
          for (let q = start; q < end; q++) {
            const i = idxs[q], s = span[q - start];
            d[i] = s[0]; d[i + 1] = s[1]; d[i + 2] = s[2]; d[i + 3] = s[3];
          }
        }
        p++;
      }
    }
    x.putImageData(img, x0, y0);
  }

  // DATAMOSH SHEAR: copy horizontal/diagonal slices and re-stamp them offset &
  // ghosted, so color "melts" and bleeds across a boundary. Bounded slice count.
  // Slices can extend slightly PAST the region so the worked area integrates
  // into the calm field instead of reading as a pasted rectangle.
  function datamosh(x, W, H, r, opts) {
    const { x0, y0, w, h, dir, slices, maxOff, ghost } = opts;
    const bleed = Math.min(W, H) * 0.10; // grab a little extra past the edge
    for (let s = 0; s < slices; s++) {
      const sh = 4 + r() * (h / 14);
      const sy = y0 + r() * (h - sh);
      // occasionally pull from a wider strip so the melt drags into negative space
      const ext = r() < 0.5 ? bleed * r() : 0;
      const gx = Math.max(0, x0 - ext * 0.3);
      const gw = Math.min(W - gx, w + ext);
      let img;
      try { img = x.getImageData(gx, sy, gw, sh); } catch (e) { continue; }
      const off = (r() - 0.5) * maxOff;
      const voff = dir === 'Diagonal Shear' ? (r() - 0.5) * maxOff * 0.4 : 0;
      x.save();
      x.globalAlpha = ghost;
      x.putImageData(img, gx + off, sy + voff);
      x.restore();
      // a faint trailing echo to read as "ghost" smear
      if (r() < 0.5) {
        x.save();
        x.globalAlpha = ghost * 0.5;
        x.putImageData(img, gx + off * 1.6, sy + voff * 1.6);
        x.restore();
      }
    }
  }

  // BLOCK DISPLACEMENT: a few crisp macroblocks shoved sideways (compression
  // artifact look) at focal edges.
  function blockDisplace(x, W, H, r, region, n) {
    for (let i = 0; i < n; i++) {
      const bw = 18 + r() * (region.w * 0.22);
      const bh = 14 + r() * (region.h * 0.18);
      const bx = region.x0 + r() * (region.w - bw);
      const by = region.y0 + r() * (region.h - bh);
      let img;
      try { img = x.getImageData(bx, by, bw, bh); } catch (e) { continue; }
      const off = (r() - 0.5) * 40;
      x.putImageData(img, bx + off, by);
    }
  }

  // ---- the painting ----------------------------------------------------------

  function draw(cv, seed) {
    const r = K.rng(seed);
    const p = params(r);
    const P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const pal = roles(P, r);

    // ── 1. BRIGHT HOLOGRAPHIC GROUND (dominant, luminous, never dark) ──
    // multi-stop pearlescent sweep on a diagonal; ground hue dominates.
    const ang = r() * Math.PI;
    const gx0 = W / 2 - Math.cos(ang) * W, gy0 = H / 2 - Math.sin(ang) * H;
    const gx1 = W / 2 + Math.cos(ang) * W, gy1 = H / 2 + Math.sin(ang) * H;
    const g = x.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, K.mix(P.ground, P.hi, 0.30));
    g.addColorStop(0.42, P.ground);
    g.addColorStop(0.72, K.mix(P.ground, P.field, 0.38));
    g.addColorStop(1, K.mix(P.field, P.hi, 0.22));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // soft far-field haze drift so the ground breathes (not flat) — kept light
    // so the worked planes stay CRISP and saturated, not mushy.
    K.hazeSheet(x, W, H, noise, K.mix(P.field, P.hi, 0.3), 0.16, 150, 'screen');

    // a few light-leak blooms to wash it brighter (joyful lighting) — confined
    // mostly to the calm field so the worked region reads punchy.
    for (let i = 0; i < 3; i++) {
      K.bloom(x, W * (0.1 + r() * 0.8), H * (0.1 + r() * 0.8),
        Math.min(W, H) * (0.28 + r() * 0.26), K.pick([P.hi, P.field, P.accent], r), 0.10 + r() * 0.08);
    }

    // ── 2. DEFINE the worked region vs the calm field (asymmetric) ──
    // worked region anchors to one third; the opposite area stays clean negative
    // space carrying ground color + haze.
    const isLand = W >= H;
    let region;
    if (p.event === 'Total Collapse') {
      region = { x0: 0, y0: 0, w: W, h: H };
    } else {
      // worked region hugged to the anchor corner/side, sized to leave a
      // deliberate 28-40% calm field of active negative space opposite it.
      const rw = W * (0.46 + r() * 0.18);
      const rh = H * (0.48 + r() * 0.18);
      const rx = p.anchorX === 'L' ? 0 : W - rw;
      const ry = p.anchorY === 'T' ? 0 : H - rh;
      region = { x0: rx, y0: ry, w: rw, h: rh };
    }

    // ── 3a. FULL-BLEED DIAGONAL BANDS behind the worked region (kills the
    // boxed-rectangle read; gives edge-to-edge energy). Bold saturated ribbons
    // sweeping across the whole frame on a diagonal, clipped softer outside it.
    x.save();
    const diagAng = (p.flow === 'Diagonal Shear' ? 0.5 : p.flow === 'Horizontal Drag' ? 0.06 : 1.05)
      + (r() - 0.5) * 0.3;
    const dnx = Math.cos(diagAng), dny = Math.sin(diagAng);
    const span = Math.abs(W * dnx) + Math.abs(H * dny);
    const nbands = 6 + (r() * 4 | 0);
    x.translate(W / 2, H / 2);
    x.rotate(diagAng);
    let by = -span * 0.7;
    for (let i = 0; i < nbands && by < span * 0.7; i++) {
      const bh = span * (0.05 + r() * 0.13);
      const col = K.pick(pal, r);
      // bands inside the worked third are fully saturated; outside, gentle.
      x.fillStyle = col;
      x.globalAlpha = 0.42 + r() * 0.4;
      x.fillRect(-span, by, span * 2, bh);
      by += bh + span * (0.01 + r() * 0.05);
    }
    x.restore();

    // ── 3b. TORN SATURATED COLOR PLANES — bold Promare flat blocks, crisp &
    // saturated so the pixel-sort/mosh has rich material to comb and melt. ──
    x.save();
    const nPlanes = p.dens === 'Dense' ? 7 : p.dens === 'Worked' ? 5 : 4;
    const planeAxis = p.flow === 'Horizontal Drag';
    for (let i = 0; i < nPlanes; i++) {
      const t0 = i / nPlanes;
      // pick saturated roles (skip the pale ground so blocks stay punchy); push
      // toward accent so pale palettes (Mint Coral / Peachy) keep candy punch.
      let col = K.pick([P.field, P.mid, P.accent, P.hi, P.accent2 || P.mid, P.ground], r);
      if (K.lum(col) > 0.78 && r() < 0.6) col = K.mix(col, P.accent, 0.4);
      if (planeAxis) {
        tornPlane(x, P, pal, r, region.x0, region.y0 + t0 * region.h,
          region.w, region.h / nPlanes + region.h * 0.04, col, 0.10 + r() * 0.12);
      } else {
        tornPlane(x, P, pal, r, region.x0 + t0 * region.w, region.y0,
          region.w / nPlanes + region.w * 0.05, region.h, col, 0.08 + r() * 0.10);
      }
    }
    x.restore();

    // a couple of bold confident flat shards crossing the boundary (graphic punch)
    const nShards = 2 + (r() * 3 | 0);
    for (let i = 0; i < nShards; i++) {
      x.save();
      const cx = region.x0 + r() * region.w, cy = region.y0 + r() * region.h;
      const sw = Math.min(W, H) * (0.14 + r() * 0.22), sh = sw * (0.3 + r() * 0.5);
      const rot = (r() - 0.5) * 1.2;
      x.translate(cx, cy); x.rotate(rot);
      x.fillStyle = K.mix(K.pick(pal, r), P.hi, r() < 0.3 ? 0.3 : 0);
      x.globalAlpha = 0.78 + r() * 0.22;
      x.fillRect(-sw / 2, -sh / 2, sw, sh);
      // colored (not black) contour for Promare graphic punch
      x.globalAlpha = 0.5;
      x.lineWidth = 2 + r() * 2;
      x.strokeStyle = K.mix(K.pick(pal, r), '#202028', 0.35);
      x.strokeRect(-sw / 2, -sh / 2, sw, sh);
      x.restore();
    }

    // watercolor bleed: lightly soften plane boundaries (kept low so planes
    // stay readable as bold blocks, not fog)
    K.hazeSheet(x, region.w, region.h, noise, K.mix(P.mid, P.hi, 0.25), 0.06, 70, 'screen');

    // ── 4. INTERFERENCE / MOIRÉ region (optional, as a textured incident) ──
    if (p.moire !== 'None') {
      x.save();
      x.globalCompositeOperation = 'overlay';
      const mx = region.x0 + region.w * (0.1 + r() * 0.4);
      const my = region.y0 + region.h * (0.1 + r() * 0.4);
      const mw = region.w * (0.35 + r() * 0.3), mh = region.h * (0.35 + r() * 0.3);
      const gap = p.moire === 'Rainbow Beat' ? 3 : 5;
      const a2 = r() * 0.4;
      for (let yy = my; yy < my + mh; yy += gap) {
        const hue = p.moire === 'Rainbow Beat' ? ((yy * 1.7) % 360) : null;
        x.strokeStyle = hue != null ? K.rgba(K.hsl2hex(hue, 0.9, 0.6), 0.28) : K.rgba(P.hi, 0.18);
        x.lineWidth = 1;
        x.beginPath();
        for (let xx = mx; xx < mx + mw; xx += 4) {
          const yo = Math.sin((xx - mx) * 0.06 + a2) * 3;
          xx === mx ? x.moveTo(xx, yy + yo) : x.lineTo(xx, yy + yo);
        }
        x.stroke();
      }
      x.restore();
    }

    // ── 5. PIXEL-SORT STREAKS — luminous combed silk ──
    // run inside the worked region; direction follows Flow.
    const vertical = p.flow !== 'Horizontal Drag';
    const sortBands = p.dens === 'Dense' ? 3 : p.dens === 'Worked' ? 2 : 1;
    for (let b = 0; b < sortBands; b++) {
      // bright band — sort the saturated mids/highs so silk reads luminous
      const bx = region.x0 + (vertical ? r() * region.w * 0.55 : 0);
      const by = region.y0 + (vertical ? 0 : r() * region.h * 0.55);
      const bw = vertical ? region.w * (0.35 + r() * 0.5) : region.w;
      const bh = vertical ? region.h : region.h * (0.35 + r() * 0.5);
      pixelSort(x, W, H, {
        x0: Math.max(0, bx | 0), y0: Math.max(0, by | 0),
        w: Math.min(W - (bx | 0), bw | 0), h: Math.min(H - (by | 0), bh | 0),
        vertical,
        thr: { lo: 60 + r() * 50, hi: 252 },
        intensity: 1,
      });
    }
    // perfect-sort chase: a clean full-region rainbow sort, run twice (vertical
    // then a soft second pass) so the combed silk reads as the hero element.
    if (p.event === 'Perfect Sort') {
      pixelSort(x, W, H, {
        x0: region.x0 | 0, y0: region.y0 | 0, w: region.w | 0, h: region.h | 0,
        vertical: true, thr: { lo: 20, hi: 254 }, intensity: 1,
      });
      // a luminous sheen down the sorted silk to make it glow
      x.save(); x.globalCompositeOperation = 'lighter';
      const sg = x.createLinearGradient(region.x0, 0, region.x0 + region.w, 0);
      sg.addColorStop(0, K.rgba(P.hi, 0));
      sg.addColorStop(0.5, K.rgba(P.hi, 0.12));
      sg.addColorStop(1, K.rgba(P.hi, 0));
      x.fillStyle = sg; x.fillRect(region.x0, region.y0, region.w, region.h);
      x.restore();
    }

    // ── 6. DATAMOSH SHEAR — melt/ghost across the tear boundary ──
    const moshSlices = p.event === 'Total Collapse' ? 26 : p.dens === 'Dense' ? 16 : p.dens === 'Worked' ? 11 : 7;
    datamosh(x, W, H, r, {
      x0: region.x0 | 0, y0: region.y0 | 0, w: region.w | 0, h: region.h | 0,
      dir: p.flow, slices: moshSlices,
      maxOff: Math.min(W, H) * (p.event === 'Total Collapse' ? 0.18 : 0.10),
      ghost: 0.42 + r() * 0.16,
    });

    // ── 6b. FEATHER the worked-region boundary into the calm field so it reads
    // as a melt, not a pasted rectangle. Soft gradient veil along the inner edge
    // facing the negative space, tinted with the ground for seamless blend. ──
    if (p.event !== 'Total Collapse') {
      x.save();
      const towardX = p.anchorX === 'L' ? 1 : -1; // worked edge faces this way
      const towardY = p.anchorY === 'T' ? 1 : -1;
      const edgeX = p.anchorX === 'L' ? region.x0 + region.w : region.x0;
      const edgeY = p.anchorY === 'T' ? region.y0 + region.h : region.y0;
      const feather = Math.min(W, H) * 0.16;
      // vertical-ish edge feather
      let fg = x.createLinearGradient(edgeX - towardX * feather, 0, edgeX + towardX * feather, 0);
      fg.addColorStop(0, K.rgba(P.ground, 0));
      fg.addColorStop(1, K.rgba(K.mix(P.ground, P.hi, 0.25), 0.34));
      x.fillStyle = fg;
      x.fillRect(Math.min(edgeX, edgeX + towardX * feather), 0, feather, H);
      // horizontal-ish edge feather
      let fg2 = x.createLinearGradient(0, edgeY - towardY * feather, 0, edgeY + towardY * feather);
      fg2.addColorStop(0, K.rgba(P.ground, 0));
      fg2.addColorStop(1, K.rgba(K.mix(P.ground, P.hi, 0.25), 0.26));
      x.fillStyle = fg2;
      x.fillRect(0, Math.min(edgeY, edgeY + towardY * feather), W, feather);
      x.restore();
    }

    // ── 7. BLOCK DISPLACEMENT at focal edge (compression-artifact flecks) ──
    if (p.event !== 'Perfect Sort') {
      blockDisplace(x, W, H, r, region, p.dens === 'Dense' ? 7 : 4);
    }

    // ── 8. CONTROLLED RGB / CHROMATIC SPLIT at the focal edge ──
    // restrained few px; reads as holographic shimmer, not a broken TV.
    K.chromaSplit(x, W, H, p.event === 'Total Collapse' ? 4 : 2);

    // ── 9. NEAR-LAYER FINISH: foil glints + grain over haze (depth) ──
    // a tiny dense bright incident in the calm field to counterweight the mass
    const cfx = p.anchorX === 'L' ? W * (0.78 + r() * 0.12) : W * (0.10 + r() * 0.12);
    const cfy = p.anchorY === 'T' ? H * (0.74 + r() * 0.14) : H * (0.12 + r() * 0.14);
    K.sheen(x, cfx, cfy, Math.min(W, H) * 0.10, P.hi, 0.5);
    for (let i = 0; i < 5; i++) {
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(K.pick([P.hi, P.accent], r), 0.5 + r() * 0.4);
      const fs = 1 + r() * 2.4;
      x.fillRect(cfx + (r() - 0.5) * W * 0.18, cfy + (r() - 0.5) * H * 0.18, fs, fs);
      x.restore();
    }

    // final brightening + texture so nothing reads muddy
    K.hazeSheet(x, W, H, noise, K.mix(P.hi, P.field, 0.4), 0.07, 200, 'screen');
    K.grain(x, W, H, 700, r);
    K.sheen(x, W * 0.5, H * 0.42, Math.max(W, H) * 0.5, P.hi, 0.05);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k3_mosh', draw, traits };
})();
