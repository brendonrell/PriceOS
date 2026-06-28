/* GROUP CHAT — the abstract essence of many voices at once.
 * Rothko-meets-iMessage: soft colour-coded bubble LOZENGES massing into
 * luminous fields — the texture of overlapping conversation. Each "participant"
 * is a colour; the picture is the choreography of colour-voices interrupting,
 * agreeing, piling up. SURREAL = real-but-off: the bubbles obey a fluid/gravity
 * that's WRONG — they pool, rise, cluster into a single organism. Typing-dot
 * triplets and reaction chips recur as a rhythmic motif. No words — this is
 * COLOUR MASS and rhythm.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six bespoke palettes. Each = a GROUND + 4–6 desaturated "voice" colours,
     harmonious with one or two surprising voices. Distinct from any yellow-on-
     black chat piece and from the neon catalog. */
  const PALS = [
    { name: 'Plaster',   ground: '#e8e0d2', glow: false,
      voices: ['#bd6a4e', '#8a9b7a', '#5d6b78', '#34302f', '#8aa3b8', '#c9a15c'] },
    { name: 'Slate',     ground: '#c7cdd2', glow: false,
      voices: ['#2f8d86', '#c79038', '#854f6e', '#2f343b', '#ece6da', '#b06149'] },
    { name: 'Dusk',      ground: '#241a2b', glow: true,
      voices: ['#e8755f', '#7fd6b0', '#e8c167', '#c08bb8', '#6f8fe0', '#e9a7c0'] },
    { name: 'Tide',      ground: '#3a4642', glow: true,
      voices: ['#7ab59a', '#d2bd8f', '#bb6f5f', '#9aa6a4', '#c98a6a', '#e6ddc8'] },
    { name: 'Ember',     ground: '#1d1715', glow: true,
      voices: ['#e0a24a', '#b35a3c', '#8f8a4e', '#e8dcc0', '#d98455', '#9c6f5a'] },
    { name: 'Porcelain', ground: '#f1eee7', glow: false,
      voices: ['#9a3b3b', '#3a5a8a', '#c9a23c', '#3f6b4e', '#6a5a7a', '#5a5550'] },
  ];

  const MODES = ['Pileup', 'Updraft', 'Constellation', 'Chorus', 'Standoff', 'Quiet'];
  const FORMATS = [[1040, 1300], [1180, 1180], [1300, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 11);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const glow = pal.glow;

    // ── GROUND: soft fbm-modulated wash (never flat) ──
    x.fillStyle = pal.ground;
    x.fillRect(0, 0, W, H);
    // gentle tonal field across the ground so it breathes like a Rothko ground
    (function groundField() {
      const gdark = K.mix(pal.ground, glow ? '#000000' : '#9a958a', glow ? 0.42 : 0.20);
      const glite = K.mix(pal.ground, glow ? '#7a6a80' : '#ffffff', glow ? 0.18 : 0.35);
      const step = Math.max(4, Math.floor(S / 150));
      x.save();
      for (let yy = 0; yy < H; yy += step) {
        for (let xx = 0; xx < W; xx += step) {
          const n = (noise.fbm(xx / (S * 0.7), yy / (S * 0.7), 4, 0.55, 2.0) + 1) / 2;
          const c = n > 0.5 ? K.mix(pal.ground, glite, (n - 0.5) * 0.9) : K.mix(pal.ground, gdark, (0.5 - n) * 0.9);
          x.fillStyle = c;
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();
    })();

    /* ── a single soft bubble LOZENGE with gradient fill + soft shadow ──
       Rounded-rect; gentle vertical gradient; drop-shadow underneath; optional
       inner sheen. Blends (screen for glow palettes, multiply for light ones)
       give luminous overlapping depth. */
    function lozenge(cx, cy, w, h, col, opa, blend) {
      const rad = Math.min(w, h) * (0.42 + r() * 0.08);
      // soft drop shadow first (offset down)
      x.save();
      x.globalCompositeOperation = 'multiply';
      const sh = glow ? 0.16 : 0.10;
      const sg = x.createRadialGradient(cx, cy + h * 0.22, 0, cx, cy + h * 0.22, Math.max(w, h) * 0.75);
      sg.addColorStop(0, 'rgba(0,0,0,' + (sh * opa) + ')');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = sg;
      x.fillRect(cx - w, cy - h * 0.3, w * 2, h * 1.6);
      x.restore();

      // bubble body
      x.save();
      x.globalCompositeOperation = blend;
      // vertical gradient fill: lighter top → fuller body → slightly darker base
      const top = K.mix(col, '#ffffff', glow ? 0.20 : 0.22);
      const bot = K.mix(col, glow ? '#000000' : '#3a2f2a', glow ? 0.22 : 0.06);
      const g = x.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
      g.addColorStop(0, K.rgba(top, opa));
      g.addColorStop(0.55, K.rgba(col, opa));
      g.addColorStop(1, K.rgba(bot, opa));
      x.fillStyle = g;
      rr(cx - w / 2, cy - h / 2, w, h, rad);
      x.fill();
      x.restore();

      // inner top sheen (glassy)
      x.save();
      x.globalCompositeOperation = 'screen';
      const shg = x.createRadialGradient(cx - w * 0.12, cy - h * 0.28, 0, cx - w * 0.12, cy - h * 0.28, w * 0.55);
      shg.addColorStop(0, K.rgba('#ffffff', (glow ? 0.18 : 0.12) * opa));
      shg.addColorStop(1, K.rgba('#ffffff', 0));
      x.fillStyle = shg;
      rr(cx - w / 2, cy - h / 2, w, h, rad);
      x.fill();
      x.restore();
    }

    function rr(bx, by, bw, bh, rad) {
      const rd = Math.min(rad, bh / 2, bw / 2);
      x.beginPath();
      x.moveTo(bx + rd, by);
      x.arcTo(bx + bw, by, bx + bw, by + bh, rd);
      x.arcTo(bx + bw, by + bh, bx, by + bh, rd);
      x.arcTo(bx, by + bh, bx, by, rd);
      x.arcTo(bx, by, bx + bw, by, rd);
      x.closePath();
    }

    /* ── typing-dot triplet — the recurring rhythmic motif ── */
    function typingDots(cx, cy, scale, col, opa) {
      const d = scale * 0.5;
      const blend = glow ? 'screen' : 'source-over';
      // little carrier bubble behind the dots
      x.save();
      x.globalCompositeOperation = glow ? 'screen' : 'multiply';
      x.fillStyle = K.rgba(K.mix(col, pal.ground, 0.35), opa * 0.5);
      rr(cx - scale * 1.9, cy - scale * 0.95, scale * 3.8, scale * 1.9, scale * 0.95);
      x.fill();
      x.restore();
      x.save();
      x.globalCompositeOperation = blend;
      for (let i = -1; i <= 1; i++) {
        x.fillStyle = K.rgba(K.mix(col, '#ffffff', 0.3), opa);
        x.beginPath();
        x.arc(cx + i * scale * 1.05, cy, d, 0, 7);
        x.fill();
      }
      x.restore();
    }

    /* ── reaction chip — small heart/plus pill motif ── */
    function reactionChip(cx, cy, scale, col, opa) {
      x.save();
      x.globalCompositeOperation = glow ? 'screen' : 'source-over';
      // pill
      x.fillStyle = K.rgba(K.mix(col, pal.ground, 0.2), opa);
      rr(cx - scale * 1.3, cy - scale * 0.85, scale * 2.6, scale * 1.7, scale * 0.85);
      x.fill();
      // a tiny heart blob
      const hc = K.mix(col, '#ffffff', 0.45);
      x.fillStyle = K.rgba(hc, opa);
      const hs = scale * 0.42;
      x.beginPath();
      x.arc(cx - hs * 0.5, cy - hs * 0.2, hs * 0.55, 0, 7);
      x.arc(cx + hs * 0.5, cy - hs * 0.2, hs * 0.55, 0, 7);
      x.moveTo(cx - hs, cy);
      x.lineTo(cx, cy + hs * 1.1);
      x.lineTo(cx + hs, cy);
      x.closePath();
      x.fill();
      x.restore();
    }

    // glow palettes glow (screen); light palettes layer as clean translucent
    // glass (source-over) so overlaps stay chromatic instead of muddying to grey.
    const blend = glow ? 'screen' : 'source-over';
    // bubbles array we'll populate per mode, then paint back-to-front (big first)
    const bubbles = [];
    function push(cx, cy, w, h, vi, opa) {
      bubbles.push({ cx, cy, w, h, col: pal.voices[vi % pal.voices.length], opa });
    }
    const NV = pal.voices.length;

    // ── COMPOSE per mode ──
    if (mode === 'Pileup') {
      // bubbles pool/stack toward the bottom under wrong (clumping) gravity
      const n = 34 + (r() * 16 | 0);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        // bias toward bottom, fbm jitter for organic packing
        const fx = noise.fbm(i * 0.3, 10, 4) ;
        const cx = W * (0.5 + fx * 0.42) + (r() - 0.5) * W * 0.12;
        const pile = Math.pow(r(), 0.5); // skew toward bottom
        const cy = H * (0.30 + pile * 0.62);
        const sz = S * (0.07 + r() * 0.17) * (0.7 + (cy / H) * 0.6);
        const w = sz * (1.4 + r() * 1.1), h = sz * (0.75 + r() * 0.4);
        push(cx, cy, w, h, (i * 2 + (r() * NV | 0)) | 0, 0.62 + r() * 0.32);
      }
    } else if (mode === 'Updraft') {
      // a rising column of voices, narrowing & brightening upward
      const n = 30 + (r() * 14 | 0);
      const colx = W * (0.5 + (r() - 0.5) * 0.2);
      for (let i = 0; i < n; i++) {
        const t = r();
        const cy = H * (0.04 + t * 0.92);
        const spread = (cy / H) * W * 0.34 + W * 0.04; // wider at base
        const cx = colx + (r() - 0.5) * spread * 2 + (noise.fbm(i * 0.5, cy / 200, 4)) * W * 0.08;
        const sz = S * (0.05 + r() * 0.14) * (0.6 + (cy / H) * 0.7);
        const w = sz * (1.3 + r() * 0.9), h = sz * (0.7 + r() * 0.4);
        push(cx, cy, w, h, (r() * NV | 0), 0.55 + (1 - cy / H) * 0.4 + r() * 0.1);
      }
    } else if (mode === 'Constellation') {
      // scattered voices with faint connectors (who replied to whom)
      const n = 12 + (r() * 8 | 0);
      const nodes = [];
      for (let i = 0; i < n; i++) {
        const cx = W * (0.12 + r() * 0.76);
        const cy = H * (0.12 + r() * 0.76);
        const sz = S * (0.06 + r() * 0.13);
        nodes.push({ cx, cy, sz, vi: (r() * NV | 0) });
      }
      // connectors first (under bubbles)
      x.save();
      x.globalCompositeOperation = glow ? 'screen' : 'multiply';
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1 + (r() * 2 | 0)) % nodes.length];
        x.strokeStyle = K.rgba(K.mix(pal.voices[a.vi], pal.ground, 0.45), glow ? 0.30 : 0.22);
        x.lineWidth = S * 0.004;
        x.beginPath();
        const mx = (a.cx + b.cx) / 2 + (r() - 0.5) * S * 0.1;
        const my = (a.cy + b.cy) / 2 + (r() - 0.5) * S * 0.1;
        x.moveTo(a.cx, a.cy);
        x.quadraticCurveTo(mx, my, b.cx, b.cy);
        x.stroke();
      }
      x.restore();
      for (const nd of nodes) {
        push(nd.cx, nd.cy, nd.sz * (1.4 + r() * 0.8), nd.sz * (0.85 + r() * 0.3), nd.vi, 0.7 + r() * 0.25);
      }
    } else if (mode === 'Chorus') {
      // dense all-over field, frame-filling — the loud room
      const n = 60 + (r() * 26 | 0);
      for (let i = 0; i < n; i++) {
        const cx = W * (r() * 1.04 - 0.02);
        const cy = H * (r() * 1.04 - 0.02);
        const fld = (noise.fbm(cx / (S * 0.5), cy / (S * 0.5), 4) + 1) / 2;
        const sz = S * (0.05 + fld * 0.14 + r() * 0.05);
        const w = sz * (1.3 + r() * 0.9), h = sz * (0.7 + r() * 0.4);
        push(cx, cy, w, h, (r() * NV | 0), 0.45 + r() * 0.4);
      }
    } else if (mode === 'Standoff') {
      // two colour-factions massing on opposite sides
      // two factions mass on opposite sides with a charged gap between. Pick
      // factions by luminance so the two sides genuinely contrast (avoids the
      // all-warm mush on single-temperature palettes like Ember).
      const byLum = pal.voices.map((c, i) => i).sort((a, b) => K.lum(pal.voices[a]) - K.lum(pal.voices[b]));
      const dark = [byLum[0], byLum[1]];           // faction A: the darker voices
      const lite = [byLum[NV - 1], byLum[NV - 2]];  // faction B: the lighter voices
      const aLeft = r() < 0.5;
      const fL = aLeft ? dark : lite, fR = aLeft ? lite : dark;
      const n = 44 + (r() * 14 | 0);
      for (let i = 0; i < n; i++) {
        const left = r() < 0.5;
        // pack tight to each edge, leave ~0.2W gap mid-frame
        const cx = left ? W * (0.02 + Math.pow(r(), 1.3) * 0.36) : W * (0.98 - Math.pow(r(), 1.3) * 0.36);
        const cy = H * (0.06 + r() * 0.88);
        const sz = S * (0.06 + r() * 0.16);
        const w = sz * (1.4 + r() * 1.0), h = sz * (0.75 + r() * 0.4);
        const side = left ? fL : fR;
        const vi = side[r() < 0.5 ? 0 : 1];
        push(cx, cy, w, h, vi, 0.62 + r() * 0.32);
      }
    } else { // Quiet — sparse, lots of negative space, big calm bubbles + dots
      const n = 4 + (r() * 4 | 0);
      for (let i = 0; i < n; i++) {
        const cx = W * (0.22 + r() * 0.56);
        const cy = H * (0.18 + r() * 0.6);
        const sz = S * (0.14 + r() * 0.18);
        const w = sz * (1.4 + r() * 0.7), h = sz * (0.85 + r() * 0.3);
        push(cx, cy, w, h, (r() * NV | 0), 0.55 + r() * 0.3);
      }
    }

    // paint biggest first so smaller, brighter voices sit on top
    bubbles.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    for (const bu of bubbles) lozenge(bu.cx, bu.cy, bu.w, bu.h, bu.col, bu.opa, blend);

    // ── motif layer: typing-dot triplets + reaction chips sprinkled in ──
    const motifN = mode === 'Quiet' ? 2 + (r() * 2 | 0)
      : mode === 'Chorus' ? 5 + (r() * 5 | 0)
      : 3 + (r() * 4 | 0);
    for (let i = 0; i < motifN; i++) {
      const cx = W * (0.1 + r() * 0.8), cy = H * (0.12 + r() * 0.76);
      const sc = S * (0.012 + r() * 0.018);
      const vi = r() * NV | 0;
      if (r() < 0.6) typingDots(cx, cy, sc, pal.voices[vi], 0.55 + r() * 0.3);
      else reactionChip(cx, cy, sc * 1.4, pal.voices[vi], 0.6 + r() * 0.3);
    }

    // ── ATMOSPHERE & TEXTURE ──
    if (glow) {
      // a soft luminous bloom from the densest cluster centroid
      let mx = 0, my = 0, tot = 0;
      for (const bu of bubbles) { const wgt = bu.w * bu.h; mx += bu.cx * wgt; my += bu.cy * wgt; tot += wgt; }
      if (tot > 0) { mx /= tot; my /= tot; K.bloom(x, mx, my, S * 0.5, K.mix(pal.voices[0], '#ffffff', 0.3), 0.10); }
    }
    const hazeCol = glow ? K.mix(pal.ground, pal.voices[0], 0.3) : K.mix(pal.ground, '#ffffff', 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, glow ? 0.16 : 0.20, S * 0.85, 'screen');
    // surface tooth: grain carries the texture (mottle's tiling read as tweed,
    // so it's gone). Lighter grounds need a finer-spaced grain so it diffuses
    // into tooth rather than reading as a pattern.
    K.grain(x, W, H, K.lum(pal.ground) > 0.7 ? 5 : 3.4, r);
    K.vignette(x, W, H, glow ? 0.40 : 0.26);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Voices: pal.voices.length };
  }

  return { name: 's03_groupchat', draw, traits };
})();
