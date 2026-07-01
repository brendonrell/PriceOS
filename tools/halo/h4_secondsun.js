/* SECOND SUN — a calm sea-to-sky horizon at golden hour, but TWO or THREE suns
 * hang at impossible spacing, each casting its own glitter-path on glassy water.
 * Sometimes a sun sits BELOW the waterline yet still glows; sometimes one disc is
 * dark (an eclipse pair, ringed by corona). Serene, real-but-OFF — never neon,
 * never psychedelic. Warm sodium amber → rose → deep teal sea, dark below.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six palettes — all sodium-amber / rose / deep-teal sea, but each a different
     hour & weather so the SET reads varied, never one image reskinned.
     hi=top sky, mid=horizon glow band, low=sea near horizon, deep=sea floor,
     sun=disc core, halo=sun bloom tint, ink=silhouettes, sea2=glassy mid-sea. */
  const PALS = [
    { name: 'Sodium Calm',  hi: '#1E4F4C', mid: '#E8895A', low: '#9A6650', deep: '#0E1C24', sun: '#F2B25C', halo: '#F0D9B0', sea2: '#1F4744', ink: '#0A161E' },
    { name: 'Rose Slack',   hi: '#2E3F58', mid: '#E79A86', low: '#8A5A5C', deep: '#121A28', sun: '#F4C079', halo: '#F2D8C2', sea2: '#28465A', ink: '#0E1622' },
    { name: 'Amber Glass',  hi: '#163E3C', mid: '#F2B25C', low: '#9C7048', deep: '#0A1820', sun: '#FBE0A2', halo: '#F0D9B0', sea2: '#1C423E', ink: '#08161C' },
    { name: 'Teal Eclipse', hi: '#0F2E34', mid: '#C2705A', low: '#6E4642', deep: '#08131A', sun: '#E8895A', halo: '#F0C49A', sea2: '#143438', ink: '#060F16' },
    { name: 'Sirocco Dusk', hi: '#4A4244', mid: '#E8A05E', low: '#8A5E44', deep: '#1A1214', sun: '#F4C97E', halo: '#EFD9B6', sea2: '#3E3A3E', ink: '#120C0E' },
    { name: 'Pale Salt',    hi: '#7E9890', mid: '#F0C58A', low: '#A88064', deep: '#33403E', sun: '#FBEFCF', halo: '#F4E6CC', sea2: '#5E7670', ink: '#26302E' },
  ];

  const MODES = ['One Too Many', 'Triple Dawn', 'Sunken', 'Eclipse Pair', 'Mirror Horizon', 'Low Noon'];
  const FORMATS = [[1280, 854], [1140, 1140]]; // wide landscape (~1.5), square

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 5);
    const pal = pickPal(r);
    const mode = MODES[seed % MODES.length];     // deterministic spread across seeds
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // Mirror Horizon places the seam dead centre; others sit high so sea dominates
    const hz = mode === 'Mirror Horizon' ? H * (0.49 + r() * 0.02) : H * (0.40 + r() * 0.10);

    // ─────────────────────────────────────────────────────────────
    // SKY — a soft gouache wash: cool high air sinking to a hot glow band
    // riding the horizon. Painted, never a flat vector ramp.
    // ─────────────────────────────────────────────────────────────
    const sky = x.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, pal.hi);
    sky.addColorStop(0.46, K.mix(pal.hi, pal.mid, 0.28));
    sky.addColorStop(0.74, K.mix(pal.hi, pal.mid, 0.62));
    sky.addColorStop(0.92, K.mix(pal.mid, pal.halo, 0.12));
    sky.addColorStop(1, pal.mid);
    x.fillStyle = sky; x.fillRect(0, 0, W, hz + 2);
    // a warmer haze cushion hugging the horizon (where the air is thick) — kept
    // low & tight so the cool high air keeps its colour and the top isn't dead.
    const glow = x.createLinearGradient(0, hz - H * 0.15, 0, hz + H * 0.02);
    glow.addColorStop(0, K.rgba(pal.mid, 0));
    glow.addColorStop(0.72, K.rgba(K.mix(pal.mid, pal.halo, 0.35), 0.5));
    glow.addColorStop(1, K.rgba(pal.halo, 0.66));
    x.fillStyle = glow; x.fillRect(0, hz - H * 0.15, W, H * 0.17);

    // ─────────────────────────────────────────────────────────────
    // SEA — glassy, deepening with depth. A bright liquid band just under
    // the horizon catches the suns; it falls to near-black at the bottom.
    // ─────────────────────────────────────────────────────────────
    const sea = x.createLinearGradient(0, hz, 0, H);
    sea.addColorStop(0, K.mix(pal.low, pal.halo, 0.34));      // warm reflected glow on the near-horizon water
    sea.addColorStop(0.12, pal.low);
    sea.addColorStop(0.30, K.mix(pal.low, pal.sea2, 0.62));   // warm falls to cool teal quickly
    sea.addColorStop(0.55, pal.sea2);
    sea.addColorStop(1, pal.deep);                            // near-black teal floor
    x.fillStyle = sea; x.fillRect(0, hz, W, H - hz);

    // ── a single SUN: disc + bloom + a tapering glitter column on the water ──
    // sy can be above (in sky), on, or below the horizon. dark=eclipse disc.
    function paintSun(sx, sy, rad, intensity, dark) {
      const onWater = sy >= hz;
      // glitter / sun-path on the water beneath the disc — broken bright flecks
      // forming a wedge that widens toward the viewer (foreshortened).
      const colTop = K.mix(pal.sun, pal.halo, 0.4);
      const pathTop = Math.max(hz, sy);
      x.save();
      x.globalCompositeOperation = 'lighter';
      for (let yy = pathTop; yy < H; yy += 3) {
        const t = (yy - pathTop) / (H - pathTop);             // 0 at top → 1 at bottom
        const wob = noise.fbm(sx / 60, yy / 22, 3) * rad * 0.5;
        const half = rad * (0.5 + t * 2.6);                   // wedge widens downward
        const cxp = sx + wob * 0.4;
        // brightness fades with depth & flickers along the band
        const fl = (noise.fbm(yy / 9, sx / 40, 3) + 1) / 2;
        const a = intensity * (1 - t) * (1 - t) * (0.18 + fl * 0.5);
        if (a < 0.012) continue;
        // a soft luminous stripe + a few crisp glints riding it
        x.fillStyle = K.rgba(colTop, a * 0.5);
        x.fillRect(cxp - half, yy, half * 2, 2.4);
        const nGl = 1 + (fl * 3 | 0);
        for (let g = 0; g < nGl; g++) {
          const gx = cxp + (noise.noise2(yy * 0.5 + g * 12, sx) ) * half;
          const gw = rad * (0.06 + (1 - t) * 0.16);
          x.fillStyle = K.rgba('#fff6e2', a * (0.5 + 0.5 * (1 - t)));
          x.fillRect(gx - gw / 2, yy, gw, 2.2);
        }
      }
      x.restore();

      // atmospheric bloom around the disc
      if (!dark) {
        K.bloom(x, sx, sy, rad * (3.4 + intensity * 1.6), pal.halo, 0.16 * intensity);
        K.bloom(x, sx, sy, rad * 1.9, pal.sun, 0.34 * intensity);
      }

      // the disc itself
      x.save();
      if (dark) {
        // eclipse: a dark disc ringed by a thin bright corona
        K.bloom(x, sx, sy, rad * 2.4, pal.halo, 0.5);
        x.fillStyle = K.rgba(K.mix(pal.ink, '#000', 0.4), 0.96);
        x.beginPath(); x.arc(sx, sy, rad, 0, 7); x.fill();
        // corona rim
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba('#fff3da', 0.8); x.lineWidth = Math.max(1.5, rad * 0.06);
        x.beginPath(); x.arc(sx, sy, rad * 1.02, 0, 7); x.stroke();
        x.strokeStyle = K.rgba(pal.halo, 0.5); x.lineWidth = Math.max(1, rad * 0.16);
        x.beginPath(); x.arc(sx, sy, rad * 1.1, 0, 7); x.stroke();
      } else {
        // luminous disc — hot core, softening to the halo at the rim
        const dg = x.createRadialGradient(sx, sy, 0, sx, sy, rad);
        dg.addColorStop(0, K.mix(pal.sun, '#ffffff', 0.45));
        dg.addColorStop(0.62, pal.sun);
        dg.addColorStop(0.9, K.mix(pal.sun, pal.halo, 0.6));
        dg.addColorStop(1, K.rgba(pal.halo, 0.0));
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = dg;
        x.beginPath(); x.arc(sx, sy, rad, 0, 7); x.fill();
      }
      x.restore();

      // if the sun sits BELOW the waterline, lay a glassy veil + caustic ripples
      // over it so it reads as glowing THROUGH the sea (the uncanny bit).
      if (onWater && sy > hz + rad * 0.2) {
        // a teal glass veil (multiply tints it submerged) then a re-lit warm core
        // (lighter) so it glows THROUGH the water rather than going grey/dead.
        x.save();
        x.globalCompositeOperation = 'multiply';
        const veil = x.createRadialGradient(sx, sy, 0, sx, sy, rad * 2.4);
        veil.addColorStop(0, K.rgba(pal.sea2, 0.14));
        veil.addColorStop(0.55, K.rgba(pal.sea2, 0.38));
        veil.addColorStop(0.82, K.rgba(pal.sea2, 0.46));
        veil.addColorStop(1, K.rgba(pal.sea2, 0));     // feather out — no hard porthole ring
        x.fillStyle = veil; x.beginPath(); x.arc(sx, sy, rad * 2.4, 0, 7); x.fill();
        x.restore();
        K.bloom(x, sx, sy, rad * 1.3, K.mix(pal.sun, pal.halo, 0.5), 0.28);
        // horizontal caustic bands across the submerged glow
        x.save(); x.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const ly = sy - rad + (i / 7) * rad * 2;
          x.strokeStyle = K.rgba(pal.halo, 0.10);
          x.lineWidth = 1.3;
          x.beginPath();
          for (let px = sx - rad * 1.4; px < sx + rad * 1.4; px += 5) {
            const yy = ly + Math.sin(px / 11 + i * 1.3) * 2.2;
            if (px === sx - rad * 1.4) x.moveTo(px, yy); else x.lineTo(px, yy);
          }
          x.stroke();
        }
        x.restore();
      }
    }

    // a faint band of distant cloud bars riding the glow (most seeds)
    function cloudBars() {
      if (r() > 0.7) return;
      x.save(); x.globalCompositeOperation = 'multiply';
      const n = 2 + (r() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const cy = hz - H * (0.04 + r() * 0.22);
        const cw = W * (0.4 + r() * 0.5), cx0 = (r() - 0.2) * W;
        const ch = H * (0.006 + r() * 0.014);
        x.fillStyle = K.rgba(K.mix(pal.ink, pal.mid, 0.45), 0.18 + r() * 0.12);
        x.beginPath(); x.ellipse(cx0, cy, cw, ch, 0, 0, 7); x.fill();
      }
      x.restore();
    }

    // glassy swell lines across the whole sea — subtle, calm, foreshortened
    function swell() {
      x.save();
      const nLines = 26;
      for (let i = 0; i < nLines; i++) {
        const t = i / nLines;
        const yy = hz + (H - hz) * (t * t);           // bunched near horizon
        const a = (1 - t) * 0.16 + 0.03;
        x.strokeStyle = K.rgba(K.mix(pal.halo, pal.low, 0.5), a);
        x.lineWidth = 1 + t * 1.5;
        x.beginPath();
        for (let px = 0; px <= W; px += 8) {
          const amp = (1 + t * 6);
          const wy = yy + Math.sin(px / (30 + t * 50) + i * 0.9) * amp
            + noise.fbm(px / 90, yy / 30, 2) * amp * 1.4;
          if (px === 0) x.moveTo(px, wy); else x.lineTo(px, wy);
        }
        x.stroke();
      }
      x.restore();
    }

    // ── COMPOSE PER MODE ──
    // every mode draws cloudBars (consumes r the same way) then places suns,
    // then swell — keeping the rng order identical for traits() mirroring.
    cloudBars();

    const baseR = S * (0.05 + r() * 0.02);

    if (mode === 'One Too Many') {
      // two suns at impossible spacing, both above water, different sizes
      const a = { x: W * (0.26 + r() * 0.1), y: hz - S * (0.04 + r() * 0.1), rad: baseR * 1.15, i: 1.0 };
      const b = { x: W * (0.62 + r() * 0.16), y: hz - S * (0.0 + r() * 0.06), rad: baseR * 0.8, i: 0.8 };
      swell();
      paintSun(a.x, a.y, a.rad, a.i, false);
      paintSun(b.x, b.y, b.rad, b.i, false);

    } else if (mode === 'Triple Dawn') {
      // three suns stacked in a near-vertical ladder rising off the horizon
      const sx = W * (0.42 + r() * 0.16);
      swell();
      for (let k = 0; k < 3; k++) {
        const sy = hz - S * (0.02 + k * (0.12 + r() * 0.03));
        const rad = baseR * (1.1 - k * 0.22);
        paintSun(sx + (r() - 0.5) * S * 0.05, sy, rad, 0.95 - k * 0.18, false);
      }

    } else if (mode === 'Sunken') {
      // one ordinary sun on the horizon + a second glowing BELOW the waterline
      const sx1 = W * (0.30 + r() * 0.12);
      const sx2 = W * (0.66 + r() * 0.12);
      swell();
      paintSun(sx2, hz + S * (0.16 + r() * 0.12), baseR * 1.05, 0.95, false);  // sunken
      paintSun(sx1, hz - S * (0.01 + r() * 0.04), baseR, 1.0, false);          // on horizon

    } else if (mode === 'Eclipse Pair') {
      // a bright sun and, beside it, a dark eclipsed disc with a corona
      const sx1 = W * (0.34 + r() * 0.08);
      const sx2 = W * (0.62 + r() * 0.1);
      swell();
      paintSun(sx1, hz - S * (0.02 + r() * 0.06), baseR * 1.1, 1.0, false);
      paintSun(sx2, hz - S * (0.04 + r() * 0.08), baseR * 0.95, 0.7, true);    // dark

    } else if (mode === 'Mirror Horizon') {
      // sky & sea near-symmetric: one sun above + its twin mirrored below,
      // the seam almost a fold. Quietest, most uncanny.
      const sx = W * (0.5 + (r() - 0.5) * 0.4);
      const off = S * (0.10 + r() * 0.06);
      swell();
      paintSun(sx, hz + off, baseR, 0.7, false);                   // mirrored (in sea)
      paintSun(sx, hz - off, baseR, 1.0, false);                   // real (in sky)

    } else { // Low Noon — one big low sun + a tiny too-close companion nudged
      // just off its shoulder, low enough that it casts its own little path too.
      const sx = W * (0.42 + (r() - 0.5) * 0.18);
      swell();
      paintSun(sx, hz - S * (0.03 + r() * 0.05), baseR * 1.55, 1.0, false);
      paintSun(sx + baseR * (2.3 + r() * 0.6), hz - S * (0.02 + r() * 0.03), baseR * 0.5, 0.78, false);
    }

    // a lone tiny boat/sail silhouette on the horizon (scale + stillness)
    if (r() < 0.55) {
      const bx = W * (0.12 + r() * 0.76), by = hz;
      x.fillStyle = K.rgba(pal.ink, 0.7);
      x.fillRect(bx, by - S * 0.006, S * 0.02, S * 0.005);
      x.beginPath();
      x.moveTo(bx + S * 0.01, by - S * 0.006);
      x.lineTo(bx + S * 0.01, by - S * 0.03);
      x.lineTo(bx + S * 0.026, by - S * 0.008);
      x.closePath(); x.fill();
    }

    // ─────────────────────────────────────────────────────────────
    // ATMOSPHERE & TEXTURE GRADE — haze, sea mottle, grain, vignette.
    // ─────────────────────────────────────────────────────────────
    const hazeCol = K.mix(pal.halo, pal.mid, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.16, S * 0.95, 'screen');
    // a thicker low haze band sitting on the horizon (sea-mist)
    const mist = x.createLinearGradient(0, hz - H * 0.05, 0, hz + H * 0.08);
    mist.addColorStop(0, K.rgba(hazeCol, 0));
    mist.addColorStop(0.45, K.rgba(K.mix(hazeCol, '#ffffff', 0.2), 0.32));
    mist.addColorStop(1, K.rgba(hazeCol, 0));
    x.fillStyle = mist; x.fillRect(0, hz - H * 0.05, W, H * 0.13);
    // surface mottle on the sea (glassy grain) + faint on sky
    K.mottle(x, 0, hz, W, H - hz, pal.sea2, 26, r, 'overlay');
    K.mottle(x, 0, 0, W, hz, pal.mid, 40, r, 'soft-light');
    // film grain over all
    K.grain(x, W, H, 5.5, r);
    // seat it — vignette pulls the eye to the horizon
    K.vignette(x, W, H, pal.name === 'Pale Salt' ? 0.34 : 0.46);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] === fmt[1] ? 'Square' : 'Landscape';
    const sunsMap = { 'One Too Many': 'Two', 'Triple Dawn': 'Three', 'Sunken': 'Two', 'Eclipse Pair': 'Two', 'Mirror Horizon': 'Two', 'Low Noon': 'Two' };
    return { Palette: pal.name, Mode: mode, Suns: sunsMap[mode], Format: f };
  }

  return { name: 'h4_secondsun', draw, traits };
})();
