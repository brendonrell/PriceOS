/* EVENING ROOMS — an empty interior at dusk where ONE law is broken.
 * Warm lamp light pools in a still room; outside (or underfoot, or through a
 * door) a cool other-world leaks in: the floor turns to mirror-water, the
 * window opens onto a sea, light gathers like liquid in a corner, a door
 * gives onto open sky, the room tilts, or a wall reflects a different room.
 * SURREAL = real-but-off: correct domestic geometry, one impossible thing.
 * Calm, uncanny, hazy, textured — never neon, never trippy.
 *
 * Palette world: warm lamp amber interior · deep umber · cool blue window/water
 * · cream wall. Reads as a different project from across the room.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six bespoke palettes — all warm-amber-interior / umber / cool-blue-exterior /
     cream-wall family, each a different hour & weather so the SET is varied,
     never one look reskinned.
     wall=lit interior wall · wallLo=shaded wall · floor=interior floor/ground ·
     lamp=warm lamp light/glow · ext=cool exterior sky/sea body · extHi=bright
     band on the horizon/water · ink=deep umber lines/shadow · trim=woodwork. */
  const PALS = [
    { name: 'Amber Vespers', wall:'#c9a978', wallLo:'#8a6f4c', floor:'#9c7c54', lamp:'#f1cd84', ext:'#4a647a', extHi:'#9cb4bf', ink:'#2a2018', trim:'#6e5237' },
    { name: 'Umber Dusk',    wall:'#b08858', wallLo:'#6e5135', floor:'#7c5c3a', lamp:'#eec27a', ext:'#3a4f63', extHi:'#7e98a6', ink:'#241a12', trim:'#5a3f28' },
    { name: 'Cream Twilight',wall:'#d8c6a8', wallLo:'#a08e6f', floor:'#b39c78', lamp:'#f6dca0', ext:'#5c7a8c', extHi:'#aac3cd', ink:'#33291f', trim:'#7c6043' },
    { name: 'Blue Hour Room',wall:'#9c8868', wallLo:'#5e5040', floor:'#6a5b44', lamp:'#e6b878', ext:'#2c3f55', extHi:'#6a869a', ink:'#1c1610', trim:'#4a3a28' },
    { name: 'Sea-Window',    wall:'#bfa074', wallLo:'#7a6044', floor:'#8a6c46', lamp:'#f0c682', ext:'#3f6b76', extHi:'#8fc0c0', ink:'#221b14', trim:'#604226' },
    { name: 'Lamp & Slate',  wall:'#a89272', wallLo:'#6a5a44', floor:'#746046', lamp:'#f2cf8c', ext:'#46505e', extHi:'#8a96a0', ink:'#1e1813', trim:'#544432' },
  ];

  const MODES = ['Flooded Floor', 'Sea Window', 'Pooled Light', 'Door to Sky', 'Tilted Room', 'Mirror Wall'];
  const FORMATS = [[1040, 1300], [1180, 1180]]; // portrait (0.8) / square

  function pickPal(r) {
    // ALWAYS consume the pick so the rng draw order is identical with/without
    // FORCE_PAL and identical to traits(). FORCE_PAL only overrides the result.
    const picked = K.pick(PALS, r);
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return picked;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 19);
    // ── HEADER rng draw order MUST match traits() EXACTLY (pal, mode, fmt, lampSide) ──
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const lampSide = r() < 0.5 ? -1 : 1; // which side the warm lamp lives on
    // ── everything below is draw-only; traits() does NOT read past lampSide ──
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const rng = (lo, hi) => lo + r() * (hi - lo);
    const jit = (a) => (r() - 0.5) * 2 * a;

    // ── PER-OUTPUT LAYOUT RNG (drives genuine within-mode variance) ──
    // The wall/floor split: how high the floor begins (camera tilt up/down).
    const floorY = H * rng(0.52, 0.72);
    // lamp glow position on its side, hard-jittered across a band
    const lampX = lampSide < 0 ? W * rng(0.06, 0.30) : W * rng(0.70, 0.94);
    const lampY = H * rng(0.30, 0.58);
    const lampR = S * rng(0.45, 0.80);
    // overall tilt of the whole scene (most modes near 0; Tilted Room amplifies)
    const baseTilt = jit(0.012);
    // vignette focus drifts toward the lamp a little
    const vigFoc = K.clamp(0.5 + lampSide * 0.04 + jit(0.03), 0.42, 0.60);
    // dust-mote density caught in the lamp light
    const motes = 16 + (r() * 30 | 0);

    // ── helper: paint a cool exterior view (sky→sea/horizon→water) into a rect.
    // Used by Sea Window, Door to Sky, Mirror Wall and the flooded reflection.
    // kind: 'sea' | 'sky' | 'room'. Returns nothing; just paints inside clip.
    function exteriorView(bx, by, bw, bh, kind, flip) {
      const dir = flip ? -1 : 1;
      // horizon height inside the opening varies per call
      const hzF = kind === 'sky' ? rng(0.62, 0.80) : rng(0.40, 0.60);
      const hzY = by + bh * hzF;
      // sky band — cool, dusk-graded, brightening at the horizon
      const sk = x.createLinearGradient(0, by, 0, hzY);
      sk.addColorStop(0, K.mix(pal.ext, pal.ink, 0.30));
      sk.addColorStop(0.62, pal.ext);
      sk.addColorStop(1, K.mix(pal.extHi, pal.lamp, 0.18)); // warm dusk seam at horizon
      x.fillStyle = sk; x.fillRect(bx, by, bw, hzY - by + 1);
      // a low cool sun/moon sitting on the horizon, off to one side
      const sunX = bx + bw * (flip ? rng(0.18, 0.42) : rng(0.58, 0.82));
      const sunY = hzY - bh * rng(0.02, 0.10);
      const sunCol = K.mix(pal.extHi, '#ffffff', 0.4);
      // stacked discs (radial-to-transparent muddies over the cool sky)
      for (let k = 7; k >= 0; k--) {
        const rr = bw * 0.04 + (bw * 0.22) * (k / 7);
        x.fillStyle = K.rgba(K.mix(sunCol, '#ffffff', 1 - k / 7 * 0.5), 0.05 + 0.05 * (1 - k / 7));
        x.beginPath(); x.arc(sunX, sunY, rr, 0, 7); x.fill();
      }
      x.fillStyle = K.rgba(sunCol, 0.85);
      x.beginPath(); x.arc(sunX, sunY, bw * rng(0.035, 0.06), 0, 7); x.fill();

      if (kind === 'sky') {
        // open sky: 1..3 pale drifting clouds, ground below the horizon is the
        // same cool sky continuing (a door onto sky has no floor)
        const sg = x.createLinearGradient(0, hzY, 0, by + bh);
        sg.addColorStop(0, K.mix(pal.extHi, pal.lamp, 0.12));
        sg.addColorStop(1, K.mix(pal.ext, pal.ink, 0.10));
        x.fillStyle = sg; x.fillRect(bx, hzY, bw, by + bh - hzY);
        const clouds = 1 + (r() * 3 | 0);
        for (let ci = 0; ci < clouds; ci++) {
          // soft horizontal wisps: a row of overlapping low-opacity puffs so it
          // reads as a drifting cloud, never a hard disc/UFO.
          const clx = bx + bw * rng(0.12, 0.88), cly = by + bh * rng(0.10, 0.50);
          const clw = bw * rng(0.12, 0.26);
          const puffs = 4 + (r() * 3 | 0);
          for (let p = 0; p < puffs; p++) {
            const pt = p / (puffs - 1) - 0.5;
            const pw = clw * (0.5 - Math.abs(pt) * 0.5) * 0.8;
            x.fillStyle = K.rgba(K.mix('#ffffff', pal.extHi, 0.25), 0.07 + r() * 0.06);
            x.beginPath();
            x.ellipse(clx + pt * clw * 1.6, cly + Math.sin(pt * 3) * clw * 0.06, pw + clw * 0.18, (pw + clw * 0.10) * 0.5, 0, 0, 7);
            x.fill();
          }
        }
      } else {
        // SEA (or generic water) below the horizon — deep cool with a luminous
        // near-horizon band and a sun-glitter column + horizontal swell lines
        const sea = x.createLinearGradient(0, hzY, 0, by + bh);
        sea.addColorStop(0, K.mix(pal.extHi, '#ffffff', 0.12));
        sea.addColorStop(0.16, K.mix(pal.ext, pal.extHi, 0.45));
        sea.addColorStop(1, K.mix(pal.ext, pal.ink, 0.55));
        x.fillStyle = sea; x.fillRect(bx, hzY, bw, by + bh - hzY);
        // sun glitter column
        x.fillStyle = K.rgba(K.mix(pal.extHi, '#ffffff', 0.5), 0.26);
        x.fillRect(sunX - bw * 0.03, hzY, bw * 0.06, by + bh - hzY);
        // swell lines, denser & wider toward the foreground
        x.strokeStyle = K.rgba(K.mix(pal.extHi, '#ffffff', 0.3), 0.22); x.lineWidth = 1;
        const lines = 6 + (r() * 5 | 0);
        for (let i = 0; i < lines; i++) {
          const t = i / lines, wy = hzY + (by + bh - hzY) * t * t;
          x.beginPath();
          for (let px = bx; px <= bx + bw; px += 6) {
            const yy = wy + Math.sin(px / (16 + i * 3) + i + dir) * (1.2 + t * 5);
            if (px === bx) x.moveTo(px, yy); else x.lineTo(px, yy);
          }
          x.globalAlpha = 0.5 * (1 - t) + 0.15; x.stroke();
        }
        x.globalAlpha = 1;
        // a tiny far ship silhouette on the sea (most calls)
        if (r() < 0.7) {
          x.fillStyle = K.rgba(pal.ink, 0.6);
          const shx = bx + bw * rng(0.2, 0.8);
          x.fillRect(shx, hzY - bh * 0.012, bw * 0.035, bh * 0.010);
          x.fillRect(shx + bw * 0.014, hzY - bh * 0.03, bw * 0.004, bh * 0.020);
        }
      }
    }

    // ── helper: a reflected/echoed interior (used by Mirror Wall) — a darker,
    // cooler ghost of a room with its own little warm window, drawn into a rect.
    function reflectedRoom(bx, by, bw, bh) {
      const rfl = K.mix(pal.ext, pal.ink, 0.25);
      const fg = x.createLinearGradient(0, by, 0, by + bh);
      fg.addColorStop(0, K.mix(rfl, pal.wallLo, 0.35));
      fg.addColorStop(1, K.mix(rfl, pal.ink, 0.45));
      x.fillStyle = fg; x.fillRect(bx, by, bw, bh);
      // a far interior floor line
      const rFloor = by + bh * rng(0.58, 0.74);
      x.fillStyle = K.rgba(K.mix(rfl, pal.ink, 0.55), 0.7);
      x.fillRect(bx, rFloor, bw, by + bh - rFloor);
      // a small bright window glowing on the far wall of the reflected room —
      // placed on the OPPOSITE side from the real lamp (the wrong room)
      const wwx = bx + bw * (lampSide < 0 ? rng(0.55, 0.78) : rng(0.18, 0.40));
      const wwy = by + bh * rng(0.22, 0.40);
      const www = bw * rng(0.14, 0.22), wwh = www * rng(1.1, 1.5);
      K.bloom(x, wwx, wwy + wwh * 0.5, www * 1.8, pal.lamp, 0.32);
      x.fillStyle = K.mix(pal.lamp, pal.extHi, 0.25);
      x.fillRect(wwx - www / 2, wwy, www, wwh);
      x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = Math.max(1.5, www * 0.04);
      x.strokeRect(wwx - www / 2, wwy, www, wwh);
      x.beginPath(); x.moveTo(wwx, wwy); x.lineTo(wwx, wwy + wwh); x.stroke();
      x.beginPath(); x.moveTo(wwx - www / 2, wwy + wwh / 2); x.lineTo(wwx + www / 2, wwy + wwh / 2); x.stroke();
      // a tiny far chair/object silhouette for the lived-in echo
      if (r() < 0.7) {
        x.fillStyle = K.rgba(pal.ink, 0.5);
        const ox = bx + bw * rng(0.2, 0.8);
        x.fillRect(ox, rFloor - bh * 0.10, bw * 0.05, bh * 0.10);
        x.fillRect(ox, rFloor - bh * 0.18, bw * 0.012, bh * 0.08);
      }
    }

    // ── helper: a window/door frame (mullioned), drawn over an opening rect.
    // Lit wood trim, lit edge toward the lamp. paneStyle: 'window'|'door'.
    function frameOpening(bx, by, bw, bh, tk, paneStyle) {
      // sill / casing — bevelled wood
      const litLeft = lampX < bx + bw / 2;
      function bar(px, py, pw, ph) {
        const lg = x.createLinearGradient(px, py, px + pw, py + ph);
        lg.addColorStop(0, K.mix(pal.trim, litLeft ? pal.lamp : pal.ink, 0.30));
        lg.addColorStop(1, K.mix(pal.trim, litLeft ? pal.ink : pal.lamp, 0.30));
        x.fillStyle = lg; x.fillRect(px, py, pw, ph);
        // top edge highlight
        x.fillStyle = K.rgba(K.mix(pal.trim, pal.lamp, 0.4), 0.5); x.fillRect(px, py, pw, Math.max(1, ph * 0.10));
      }
      // outer frame
      bar(bx - tk, by - tk, bw + tk * 2, tk);          // top
      bar(bx - tk, by + bh, bw + tk * 2, tk);          // bottom (sill)
      bar(bx - tk, by - tk, tk, bh + tk * 2);          // left
      bar(bx + bw, by - tk, tk, bh + tk * 2);          // right
      // mullions: a cross (window) or a single upright + a lintel band (door)
      x.fillStyle = K.mix(pal.trim, pal.ink, 0.1);
      if (paneStyle === 'window') {
        const mt = Math.max(2, tk * 0.5);
        x.fillRect(bx + bw / 2 - mt / 2, by, mt, bh);   // vertical
        x.fillRect(bx, by + bh / 2 - mt / 2, bw, mt);   // horizontal
      } else {
        const mt = Math.max(2, tk * 0.5);
        x.fillRect(bx, by + bh * 0.16 - mt / 2, bw, mt); // upper lintel band
      }
    }

    // =================================================================
    // BACKDROP — the interior shell: a lit wall above, a floor below, a
    // warm lamp glow pooled on its side. Painted, never flat.
    // =================================================================
    function paintShell(tilt) {
      x.save();
      if (tilt) { x.translate(W / 2, H / 2); x.rotate(tilt); x.translate(-W / 2, -H / 2); }
      const over = Math.abs(tilt || 0) > 0.001 ? S * 0.18 : 0; // overscan for tilt
      // wall: warm at the lamp, sinking to shaded umber away from it & up high
      const wg = x.createLinearGradient(0, -over, 0, floorY);
      wg.addColorStop(0, K.mix(pal.wallLo, pal.ink, 0.25));
      wg.addColorStop(0.5, pal.wallLo);
      wg.addColorStop(1, pal.wall);
      x.fillStyle = wg; x.fillRect(-over, -over, W + over * 2, floorY + over);
      // a horizontal warm wash across the wall from the lamp side
      const ww = x.createLinearGradient(lampSide < 0 ? -over : W + over, 0, lampSide < 0 ? W : 0, 0);
      ww.addColorStop(0, K.rgba(pal.lamp, 0.22));
      ww.addColorStop(0.5, K.rgba(pal.lamp, 0.05));
      ww.addColorStop(1, K.rgba(pal.lamp, 0));
      x.fillStyle = ww; x.fillRect(-over, -over, W + over * 2, floorY + over);
      // floor plane — warm, darkening to the foreground
      const fg = x.createLinearGradient(0, floorY, 0, H + over);
      fg.addColorStop(0, K.mix(pal.floor, pal.lamp, 0.10));
      fg.addColorStop(0.4, pal.floor);
      fg.addColorStop(1, K.mix(pal.floor, pal.ink, 0.45));
      x.fillStyle = fg; x.fillRect(-over, floorY, W + over * 2, H - floorY + over * 2);
      // the wall/floor seam shadow
      x.fillStyle = K.rgba(pal.ink, 0.30); x.fillRect(-over, floorY, W + over * 2, Math.max(2, S * 0.006));
      // skirting board
      x.fillStyle = K.mix(pal.trim, pal.ink, 0.1); x.fillRect(-over, floorY - S * 0.022, W + over * 2, S * 0.022);
      x.fillStyle = K.rgba(K.mix(pal.trim, pal.lamp, 0.3), 0.4); x.fillRect(-over, floorY - S * 0.022, W + over * 2, Math.max(1, S * 0.004));
      // floorboard seams receding (perspective toward a soft vanishing point)
      const vpx = W * 0.5 + jit(W * 0.18), vpy = floorY;
      x.save(); x.strokeStyle = K.rgba(pal.ink, 0.07); x.lineWidth = 1;
      const seams = 6 + (r() * 5 | 0);
      for (let i = -seams; i <= seams; i++) {
        const fxb = W * 0.5 + i * (W / (5 + r() * 2));
        x.beginPath(); x.moveTo(fxb, H + over); x.lineTo(vpx, vpy); x.stroke();
      }
      // cross-board lines
      for (let i = 1; i <= 7; i++) {
        const t = i / 8, yy = floorY + (H - floorY + over) * t * t;
        x.globalAlpha = 0.5 * (1 - t) + 0.12;
        x.beginPath(); x.moveTo(-over, yy); x.lineTo(W + over, yy); x.stroke();
      }
      x.globalAlpha = 1; x.restore();
      // wall plaster mottle + faint floor grit
      K.mottle(x, -over, -over, W + over * 2, floorY + over, pal.wall, 30, r, 'overlay');
      K.mottle(x, -over, floorY, W + over * 2, H - floorY + over, pal.floor, 46, r, 'overlay');
      // lamp glow pooled on the wall/room (the warm interior light source)
      K.bloom(x, lampX, lampY, lampR, pal.lamp, 0.30);
      K.bloom(x, lampX, lampY, lampR * 0.45, pal.lamp, 0.22);
      x.restore();
    }

    // a single lone wooden chair in three-quarter view (the one quiet object in
    // the empty room — Hammershøi stillness). gy = floor contact y of the FRONT
    // legs. A clear, recognizable filled silhouette with depth.
    function ghostChair(cx, gy, sc, face) {
      const cw = S * 0.125 * sc, ch = S * 0.205 * sc;
      const f = face || (cx < W / 2 ? 1 : -1);   // 1 = faces/recedes right
      const seatY = gy - ch * 0.50;              // seat-top height (seat at mid)
      const seatTh = Math.max(3, ch * 0.045);    // seat slab thickness
      const legW = Math.max(3, cw * 0.10);        // leg thickness
      const depth = cw * 0.46;                    // three-quarter depth offset
      const xL = cx - cw * 0.42, xR = cx + cw * 0.42; // near seat span
      const bxL = xL + f * depth, bxR = xR + f * depth; // far (back) span, pushed by depth
      x.save();
      K.softShadow(x, cx + f * depth * 0.4, gy + ch * 0.005, cw * 1.5, 0.34);
      const body = K.mix(pal.trim, pal.ink, 0.22);
      const dk = K.mix(pal.trim, pal.ink, 0.5);
      const hi = K.mix(pal.trim, pal.lamp, 0.30);
      const a = 0.92;
      // back two legs (drawn first, darker — they're further away)
      x.fillStyle = K.rgba(dk, a);
      x.fillRect(bxL - legW / 2, seatY, legW, gy - seatY - depth * 0.18);
      x.fillRect(bxR - legW / 2, seatY, legW, gy - seatY - depth * 0.18);
      // backrest: two posts rising from the back legs + a top rail + a slat
      x.fillRect(bxL - legW / 2, gy - ch, legW, ch - (gy - seatY));
      x.fillRect(bxR - legW / 2, gy - ch, legW, ch - (gy - seatY));
      x.fillStyle = K.rgba(K.mix(body, dk, 0.3), a);
      x.fillRect(bxL - legW / 2, gy - ch, (bxR - bxL) + legW, Math.max(3, ch * 0.05)); // top rail
      x.fillRect(bxL - legW / 2, gy - ch + ch * 0.14, (bxR - bxL) + legW, Math.max(2, ch * 0.035)); // mid slat
      // seat slab as a parallelogram (depth) — lit top
      x.fillStyle = K.rgba(hi, a);
      x.beginPath();
      x.moveTo(xL, seatY); x.lineTo(xR, seatY);
      x.lineTo(bxR, seatY - depth * 0.18); x.lineTo(bxL, seatY - depth * 0.18);
      x.closePath(); x.fill();
      // seat front edge (the thickness)
      x.fillStyle = K.rgba(body, a);
      x.fillRect(xL, seatY, xR - xL, seatTh);
      // front two legs (nearest, lightest)
      x.fillStyle = K.rgba(body, a);
      x.fillRect(xL - legW / 2, seatY, legW, gy - seatY);
      x.fillRect(xR - legW / 2, seatY, legW, gy - seatY);
      // a faint lamp-side highlight down the front leg facing the lamp
      x.fillStyle = K.rgba(K.mix(pal.trim, pal.lamp, 0.5), 0.4);
      const litLeg = lampSide < 0 ? xL : xR;
      x.fillRect(litLeg - legW / 2, seatY, Math.max(1, legW * 0.3), gy - seatY);
      x.restore();
    }

    // =================================================================
    // COMPOSE PER MODE
    // =================================================================

    if (mode === 'Flooded Floor') {
      // The floor has become still water reflecting the wall & window above.
      paintShell(baseTilt);
      // pick the exterior kind ONCE so the window and its reflection match.
      const ffKind = r() < 0.5 ? 'sky' : 'sea';
      // a window on the wall, sitting reasonably low so its reflection lands in
      // the water. size/side/height vary per output.
      const winW = W * rng(0.22, 0.34), winH = winW * rng(1.0, 1.4);
      const winX = (lampSide < 0 ? W * rng(0.52, 0.74) : W * rng(0.14, 0.36)) - winW / 2;
      const winY = floorY - winH - floorY * rng(0.04, 0.16);
      const tk = Math.max(4, winW * 0.05);
      // window opening
      x.save(); x.beginPath(); x.rect(winX, winY, winW, winH); x.clip();
      exteriorView(winX, winY, winW, winH, ffKind, false);
      x.restore();
      K.bloom(x, winX + winW / 2, winY + winH / 2, winW * 1.4, pal.extHi, 0.10);
      frameOpening(winX, winY, winW, winH, tk, 'window');
      // the lone chair, standing IN the water (its legs will reflect too)
      const chairX = lampSide < 0 ? W * rng(0.18, 0.34) : W * rng(0.66, 0.82);
      const chairScale = rng(0.85, 1.15);
      const showChair = r() < 0.85;

      // THE WATER: the floor is a still mirror reflecting the wall + window.
      x.save();
      x.beginPath(); x.rect(0, floorY, W, H - floorY); x.clip();
      // 1) reflected warm wall colour, dimmed and cooling with depth
      const refl = x.createLinearGradient(0, floorY, 0, H);
      refl.addColorStop(0, K.mix(pal.wall, pal.lamp, 0.12));
      refl.addColorStop(0.5, K.mix(pal.floor, pal.ext, 0.30));
      refl.addColorStop(1, K.mix(pal.ext, pal.ink, 0.45));
      x.fillStyle = refl; x.fillRect(0, floorY, W, H - floorY);
      // reflected warm lamp pool on the water
      K.bloom(x, lampX, floorY + (H - floorY) * 0.25, lampR * 0.7, pal.lamp, 0.22);
      // 2) the reflected WINDOW: mirror the exterior vertically below the floor,
      // broken into horizontal ripple bands offset left/right so it reads as
      // disturbed water, not a second pane of glass. Reflection dims with depth.
      const reflTop = floorY + (floorY - (winY + winH)); // where the mirrored sill lands
      const bands = 26;
      for (let b = 0; b < bands; b++) {
        const t = b / bands;                       // 0=near floor .. 1=deep
        const dstY = floorY + (floorY - winH) * 0 + (floorY - winY - winH) + t * winH;
        const y0 = floorY + t * winH;              // band top in the water
        if (y0 > H) break;
        const bandH = winH / bands + 1.5;
        const wob = Math.sin(t * 18 + seed * 0.7) * winW * (0.015 + t * 0.05);
        const stretch = 1 + t * 0.10;              // slight vertical stretch with depth
        x.save();
        x.beginPath(); x.rect(winX + wob, y0, winW, bandH); x.clip();
        // sample row of the exterior, flipped: near-floor band shows the window's
        // bottom (sill), deeper bands show higher up the window.
        const srcRowY = winY + winH * (1 - t);
        x.translate(winX + winW / 2 + wob, y0 + bandH / 2);
        x.scale(1, -stretch);
        x.translate(-(winX + winW / 2), -(srcRowY));
        exteriorView(winX, winY, winW, winH, ffKind, false);
        x.restore();
        // per-band cool dimming + a thin bright ripple crest
        x.fillStyle = K.rgba(K.mix(pal.ext, pal.ink, 0.3), 0.10 + t * 0.30);
        x.fillRect(winX + wob, y0, winW, bandH);
        x.fillStyle = K.rgba(K.mix(pal.extHi, '#ffffff', 0.5), 0.10 * (1 - t));
        x.fillRect(winX + wob, y0, winW, Math.max(1, bandH * 0.18));
      }
      // 3) chair reflection (a wavering dark echo) before the chair itself
      if (showChair) {
        x.save();
        x.translate(chairX, floorY);
        x.scale(1, -1.05);
        x.globalAlpha = 0.4;
        x.translate(-chairX, -floorY);
        ghostChair(chairX, floorY, chairScale);
        x.restore();
      }
      // 4) overall water glaze + horizontal ripple glints across the whole pool
      x.fillStyle = K.rgba(K.mix(pal.ext, '#ffffff', 0.08), 0.14); x.fillRect(0, floorY, W, H - floorY);
      x.strokeStyle = K.rgba(K.mix(pal.extHi, '#ffffff', 0.4), 0.20); x.lineWidth = 1;
      const glints = 12 + (r() * 8 | 0);
      for (let i = 0; i < glints; i++) {
        const t = i / glints, gy = floorY + (H - floorY) * t * t;
        x.beginPath();
        for (let px = 0; px <= W; px += 8) {
          const yy = gy + Math.sin(px / 24 + i + t * 5) * (1 + t * 7);
          if (px === 0) x.moveTo(px, yy); else x.lineTo(px, yy);
        }
        x.globalAlpha = 0.5 * (1 - t) + 0.14; x.stroke();
      }
      x.globalAlpha = 1;
      x.restore();
      // a crisp bright water-line where the wall meets the flood
      x.fillStyle = K.rgba(K.mix(pal.extHi, '#ffffff', 0.4), 0.30);
      x.fillRect(0, floorY - 1, W, 2);
      // the real chair standing in the shallow water, last
      if (showChair) ghostChair(chairX, floorY, chairScale);

    } else if (mode === 'Sea Window') {
      // A large window dominating the wall — but it opens onto an open SEA,
      // horizon and all, where a street should be. The room stays dry.
      paintShell(baseTilt);
      const winW = W * rng(0.42, 0.62), winH = (floorY) * rng(0.50, 0.74);
      const winX = (W * 0.5 + jit(W * 0.10)) - winW / 2;
      const winY = floorY * rng(0.14, 0.30);
      const tk = Math.max(5, winW * 0.035);
      x.save(); x.beginPath(); x.rect(winX, winY, winW, winH); x.clip();
      exteriorView(winX, winY, winW, winH, 'sea', lampSide > 0);
      x.restore();
      // cool light spills from the window onto the floor (a cold rectangle)
      x.save(); x.globalCompositeOperation = 'screen';
      const spillW = winW * rng(0.7, 1.1);
      const sp = x.createLinearGradient(0, floorY, 0, H);
      sp.addColorStop(0, K.rgba(pal.extHi, 0.22));
      sp.addColorStop(1, K.rgba(pal.extHi, 0));
      x.fillStyle = sp;
      const spillX = winX + winW / 2 - spillW / 2 + jit(W * 0.06);
      x.beginPath();
      x.moveTo(winX + winW * 0.1, floorY); x.lineTo(winX + winW * 0.9, floorY);
      x.lineTo(spillX + spillW, H); x.lineTo(spillX, H); x.closePath(); x.fill();
      x.restore();
      K.bloom(x, winX + winW / 2, winY + winH * 0.55, winW * 0.9, pal.extHi, 0.10);
      frameOpening(winX, winY, winW, winH, tk, 'window');
      // a chair facing the impossible sea
      if (r() < 0.85) ghostChair(lampSide < 0 ? W * rng(0.62, 0.82) : W * rng(0.18, 0.38), floorY + (H - floorY) * rng(0.20, 0.45), rng(0.9, 1.3));

    } else if (mode === 'Pooled Light') {
      // Warm lamp light has gone LIQUID — it has gathered on the floor into a
      // distinct shining puddle, with a raised meniscus rim, surface caustics
      // and a glow lifting off it, where light should be intangible. The broken
      // law: light has volume and pools like spilled honey.
      paintShell(baseTilt);
      // a cool window on the wall, so the warm liquid-light reads against cool
      const winW = W * rng(0.16, 0.26), winH = winW * rng(1.3, 1.8);
      const cornerLeft = lampSide < 0;
      const winX = (cornerLeft ? W * rng(0.60, 0.80) : W * rng(0.20, 0.40)) - winW / 2;
      const winY = floorY * rng(0.20, 0.42);
      x.save(); x.beginPath(); x.rect(winX, winY, winW, winH); x.clip();
      exteriorView(winX, winY, winW, winH, 'sea', false);
      x.restore();
      frameOpening(winX, winY, winW, winH, Math.max(4, winW * 0.05), 'window');

      // darken the bare floor so the luminous puddle reads against it
      x.fillStyle = K.rgba(pal.ink, 0.26); x.fillRect(0, floorY, W, H - floorY);

      // THE PUDDLE of light, sitting on the floor toward the lamp side. An
      // irregular ellipse seen in perspective (wider than tall), placement &
      // size seeded. Built from a wobbled radial outline.
      const pcx = (cornerLeft ? W * rng(0.22, 0.40) : W * rng(0.60, 0.78));
      const pcy = floorY + (H - floorY) * rng(0.34, 0.62);
      const prx = W * rng(0.20, 0.30);
      const pry = prx * rng(0.42, 0.60);                 // foreshortened
      const wobN = 11;
      const wob = []; for (let i = 0; i < wobN; i++) wob.push(0.82 + (0.5 + 0.5 * Math.sin(i * 2.3 + seed)) * 0.36);
      const outline = (sx, sy) => {
        x.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const k = wob[Math.floor((i / 64) * wobN) % wobN];
          const px = sx + Math.cos(a) * prx * k, py = sy + Math.sin(a) * pry * k;
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.closePath();
      };
      x.save();
      // a broad warm glow blooming up off the puddle into the room
      K.bloom(x, pcx, pcy - pry * 0.2, prx * 2.0, pal.lamp, 0.34);
      K.bloom(x, pcx, pcy, prx * 1.1, pal.lamp, 0.30);
      // puddle body
      outline(pcx, pcy);
      x.save(); x.clip();
      // radial fill: brilliant near-white centre → saturated amber edge
      const pg = x.createRadialGradient(pcx, pcy - pry * 0.15, 0, pcx, pcy, prx * 1.05);
      pg.addColorStop(0, K.mix(pal.lamp, '#ffffff', 0.55));
      pg.addColorStop(0.45, K.mix(pal.lamp, '#ffffff', 0.12));
      pg.addColorStop(0.82, pal.lamp);
      pg.addColorStop(1, K.mix(pal.lamp, pal.trim, 0.45));
      x.fillStyle = pg; x.fillRect(pcx - prx * 1.4, pcy - pry * 1.4, prx * 2.8, pry * 2.8);
      // surface caustics — concentric wavering bright arcs
      x.strokeStyle = K.rgba('#ffffff', 0.30); x.lineWidth = 1.6;
      for (let i = 1; i <= 6; i++) {
        const rr = (prx * 0.9) * (i / 6);
        x.beginPath();
        for (let a = 0; a <= 6.3; a += 0.18) {
          const wobr = rr + Math.sin(a * 5 + i + seed) * prx * 0.03;
          const px = pcx + Math.cos(a) * wobr, py = pcy + Math.sin(a) * wobr * (pry / prx);
          if (a === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.globalAlpha = 0.34 - i * 0.04; x.stroke();
      }
      x.globalAlpha = 1;
      // a cool window reflection shimmering on the warm surface (uncanny mix):
      // a soft screen-blended cool streak off to one side, never a solid disc
      x.save(); x.globalCompositeOperation = 'screen';
      const refX = pcx + (cornerLeft ? prx * 0.42 : -prx * 0.42);
      const rg = x.createLinearGradient(refX - prx * 0.12, 0, refX + prx * 0.12, 0);
      rg.addColorStop(0, K.rgba(pal.extHi, 0)); rg.addColorStop(0.5, K.rgba(K.mix(pal.extHi, '#ffffff', 0.3), 0.22)); rg.addColorStop(1, K.rgba(pal.extHi, 0));
      x.fillStyle = rg;
      x.beginPath(); x.ellipse(refX, pcy - pry * 0.05, prx * 0.12, pry * 0.62, 0, 0, 7); x.fill();
      x.restore();
      x.restore();
      // raised bright meniscus rim around the whole puddle (the liquid tell)
      x.strokeStyle = K.rgba(K.mix(pal.lamp, '#ffffff', 0.6), 0.75); x.lineWidth = Math.max(2.5, S * 0.005);
      outline(pcx, pcy); x.stroke();
      // a thin specular catch on the near rim
      x.strokeStyle = K.rgba('#ffffff', 0.5); x.lineWidth = Math.max(1.5, S * 0.0025);
      x.beginPath(); x.ellipse(pcx, pcy + pry * 0.04, prx * 0.9, pry * 0.9, 0, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
      x.restore();
      // a few drips/beads having run a little out from the puddle toward us
      const drips = 2 + (r() * 3 | 0);
      for (let d = 0; d < drips; d++) {
        const da = Math.PI * (0.2 + r() * 0.6);
        const dx2 = pcx + Math.cos(da) * prx * (0.9 + r() * 0.3);
        const dy2 = pcy + Math.abs(Math.sin(da)) * pry * (0.9 + r() * 0.4);
        const dr = S * (0.006 + r() * 0.012);
        K.bloom(x, dx2, dy2, dr * 3, pal.lamp, 0.2);
        x.fillStyle = K.rgba(K.mix(pal.lamp, '#ffffff', 0.4), 0.8);
        x.beginPath(); x.ellipse(dx2, dy2, dr, dr * 0.7, 0, 0, 7); x.fill();
        x.fillStyle = K.rgba('#ffffff', 0.5);
        x.beginPath(); x.arc(dx2 - dr * 0.3, dy2 - dr * 0.3, dr * 0.3, 0, 7); x.fill();
      }
      // the lone chair, standing at the dark edge of the room away from the pool
      if (r() < 0.7) ghostChair(cornerLeft ? W * rng(0.66, 0.84) : W * rng(0.16, 0.34), floorY + (H - floorY) * rng(0.16, 0.34), rng(0.8, 1.05));

    } else if (mode === 'Door to Sky') {
      // A doorway in the wall stands open — not onto a hall, but onto open SKY
      // at altitude. The floor stops at the threshold; sky pours in.
      paintShell(baseTilt);
      const doorW = W * rng(0.24, 0.36), doorH = floorY * rng(0.74, 0.96);
      const doorX = (W * 0.5 + jit(W * 0.16)) - doorW / 2;
      const doorY = floorY - doorH;
      const tk = Math.max(5, doorW * 0.05);
      // the sky beyond
      x.save(); x.beginPath(); x.rect(doorX, doorY, doorW, doorH); x.clip();
      exteriorView(doorX, doorY, doorW, doorH, 'sky', lampSide > 0);
      // a low threshold strip of "nothing" (the floor doesn't continue)
      x.fillStyle = K.rgba(pal.ink, 0.18); x.fillRect(doorX, floorY - doorH * 0.02, doorW, doorH * 0.02);
      x.restore();
      // bright cool sky-light spills out across the floor
      x.save(); x.globalCompositeOperation = 'screen';
      const sp = x.createLinearGradient(0, floorY, 0, H);
      sp.addColorStop(0, K.rgba(K.mix(pal.extHi, '#ffffff', 0.2), 0.28));
      sp.addColorStop(1, K.rgba(pal.extHi, 0));
      x.fillStyle = sp;
      const spillW = doorW * rng(1.0, 1.5);
      const spillX = doorX + doorW / 2 - spillW / 2 + jit(W * 0.05);
      x.beginPath();
      x.moveTo(doorX, floorY); x.lineTo(doorX + doorW, floorY);
      x.lineTo(spillX + spillW, H); x.lineTo(spillX, H); x.closePath(); x.fill();
      x.restore();
      K.bloom(x, doorX + doorW / 2, floorY - doorH * 0.3, doorW * 1.1, pal.extHi, 0.12);
      frameOpening(doorX, doorY, doorW, doorH, tk, 'door');
      // the door itself, swung open against the wall (a lit panel)
      const open = doorW * rng(0.4, 0.7);
      const hingeLeft = lampSide > 0;
      x.fillStyle = K.mix(pal.trim, pal.lamp, hingeLeft ? 0.12 : 0.02);
      x.beginPath();
      if (hingeLeft) {
        x.moveTo(doorX, doorY); x.lineTo(doorX - open, doorY + doorH * 0.05);
        x.lineTo(doorX - open, doorY + doorH * 0.98); x.lineTo(doorX, floorY);
      } else {
        x.moveTo(doorX + doorW, doorY); x.lineTo(doorX + doorW + open, doorY + doorH * 0.05);
        x.lineTo(doorX + doorW + open, doorY + doorH * 0.98); x.lineTo(doorX + doorW, floorY);
      }
      x.closePath(); x.fill();
      // door panel insets + knob
      x.strokeStyle = K.rgba(pal.ink, 0.3); x.lineWidth = 2;
      const dpx = hingeLeft ? doorX - open : doorX + doorW;
      x.strokeRect(dpx + (hingeLeft ? open * 0.18 : open * 0.22), doorY + doorH * 0.10, open * 0.6, doorH * 0.34);
      x.strokeRect(dpx + (hingeLeft ? open * 0.18 : open * 0.22), doorY + doorH * 0.50, open * 0.6, doorH * 0.34);
      x.fillStyle = K.mix(pal.lamp, '#ffffff', 0.2);
      x.beginPath(); x.arc(dpx + (hingeLeft ? open * 0.86 : open * 0.86), doorY + doorH * 0.55, doorW * 0.022, 0, 7); x.fill();
      if (r() < 0.6) ghostChair(lampSide < 0 ? W * rng(0.12, 0.26) : W * rng(0.74, 0.88), floorY + (H - floorY) * 0.12, rng(0.8, 1.1));

    } else if (mode === 'Tilted Room') {
      // The whole room is gently, wrongly tilted — gravity disobeys. Furniture
      // and the warm light hang at the room's angle, not the world's.
      const tilt = (r() < 0.5 ? -1 : 1) * rng(0.05, 0.13);
      paintShell(tilt);
      // everything else also tilts with the room
      x.save();
      x.translate(W / 2, H / 2); x.rotate(tilt); x.translate(-W / 2, -H / 2);
      const over = S * 0.18;
      // a window on the wall, tilted with the room, showing a LEVEL sea (the sea
      // outside stays level — that's the tell that the ROOM is what's wrong)
      const winW = W * rng(0.26, 0.40), winH = winW * rng(0.9, 1.3);
      const winX = (W * 0.5 + jit(W * 0.14)) - winW / 2;
      const winY = floorY * rng(0.20, 0.40);
      x.save(); x.beginPath(); x.rect(winX, winY, winW, winH); x.clip();
      // counter-rotate the view so the horizon sits LEVEL in the world
      x.translate(winX + winW / 2, winY + winH / 2); x.rotate(-tilt); x.translate(-(winX + winW / 2), -(winY + winH / 2));
      const ow = winW * 1.5, oh = winH * 1.5;
      exteriorView(winX + winW / 2 - ow / 2, winY + winH / 2 - oh / 2, ow, oh, 'sea', false);
      x.restore();
      frameOpening(winX, winY, winW, winH, Math.max(4, winW * 0.045), 'window');
      // a chair sliding toward the low corner of the tilt
      ghostChair(W * (0.5 + (tilt < 0 ? -1 : 1) * rng(0.18, 0.34)), floorY + (H - floorY) * rng(0.18, 0.45), rng(0.95, 1.3));
      // a framed picture hanging — but hanging PLUMB to the world, so crooked to
      // the tilted wall (second tell)
      if (r() < 0.8) {
        const pw = S * rng(0.10, 0.16), ph = pw * rng(0.9, 1.3);
        const pxc = W * (lampSide < 0 ? rng(0.6, 0.78) : rng(0.22, 0.4)), pyc = floorY * rng(0.22, 0.42);
        x.save();
        x.translate(pxc, pyc); x.rotate(-tilt); // plumb to world
        x.fillStyle = K.mix(pal.trim, pal.ink, 0.2); x.fillRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8);
        const ig = x.createLinearGradient(0, -ph / 2, 0, ph / 2);
        ig.addColorStop(0, K.mix(pal.ext, pal.ink, 0.2)); ig.addColorStop(1, K.mix(pal.extHi, pal.ext, 0.4));
        x.fillStyle = ig; x.fillRect(-pw / 2, -ph / 2, pw, ph);
        x.restore();
      }
      x.restore();

    } else { // Mirror Wall
      // A large mirror/aperture on the wall reflects a DIFFERENT room — the
      // wrong room, cooler, with its own little window glowing on the wrong side.
      paintShell(baseTilt);
      // the real room has a warm window of its own (so the contrast reads)
      const rwW = W * rng(0.14, 0.22), rwH = rwW * rng(1.2, 1.6);
      const rwX = (lampSide < 0 ? W * rng(0.10, 0.26) : W * rng(0.74, 0.90)) - rwW / 2;
      const rwY = floorY * rng(0.22, 0.42);
      x.save(); x.beginPath(); x.rect(rwX, rwY, rwW, rwH); x.clip();
      exteriorView(rwX, rwY, rwW, rwH, 'sea', false);
      x.restore();
      frameOpening(rwX, rwY, rwW, rwH, Math.max(4, rwW * 0.05), 'window');

      // THE MIRROR: a large framed pane that reflects a different interior
      const mW = W * rng(0.34, 0.50), mH = (floorY) * rng(0.50, 0.74);
      const mX = (lampSide < 0 ? W * rng(0.54, 0.66) : W * rng(0.34, 0.46)) - mW / 2;
      const mY = floorY * rng(0.16, 0.30);
      const tk = Math.max(6, mW * 0.04);
      x.save(); x.beginPath(); x.rect(mX, mY, mW, mH); x.clip();
      reflectedRoom(mX, mY, mW, mH);
      // a diagonal glass sheen so it reads as a mirror, not another window
      x.save(); x.globalCompositeOperation = 'screen';
      const sh = x.createLinearGradient(mX, mY, mX + mW, mY + mH);
      sh.addColorStop(0, K.rgba('#ffffff', 0.0));
      sh.addColorStop(0.42, K.rgba('#ffffff', 0.10));
      sh.addColorStop(0.5, K.rgba('#ffffff', 0.02));
      sh.addColorStop(0.62, K.rgba('#ffffff', 0.08));
      sh.addColorStop(0.7, K.rgba('#ffffff', 0.0));
      x.fillStyle = sh; x.fillRect(mX, mY, mW, mH);
      x.restore();
      x.restore();
      // ornate-ish mirror frame (use the wood frame, thicker)
      frameOpening(mX, mY, mW, mH, tk, 'door');
      // a gilt highlight on the frame toward the lamp
      x.strokeStyle = K.rgba(K.mix(pal.trim, pal.lamp, 0.5), 0.5); x.lineWidth = Math.max(1.5, tk * 0.3);
      x.strokeRect(mX - tk * 0.5, mY - tk * 0.5, mW + tk, mH + tk);
      if (r() < 0.7) ghostChair(lampSide < 0 ? W * rng(0.14, 0.28) : W * rng(0.72, 0.86), floorY + (H - floorY) * rng(0.18, 0.4), rng(0.85, 1.15));
    }

    // =================================================================
    // GLOBAL ATMOSPHERE & TEXTURE GRADE
    // =================================================================
    // warm interior haze tuned to the lamp, drifting over everything
    const hazeCol = K.mix(pal.lamp, pal.wall, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.16, S * 0.85, 'screen');
    // a second cooler haze low/near any exterior, to seat the cool world in air
    K.hazeSheet(x, W, H, noise, K.mix(pal.ext, pal.extHi, 0.4), 0.08, S * 0.5, 'screen');
    // a low warm dust pool gathering on the floor
    const dust = x.createLinearGradient(0, floorY - H * 0.08, 0, H);
    dust.addColorStop(0, K.rgba(hazeCol, 0));
    dust.addColorStop(0.5, K.rgba(K.mix(hazeCol, pal.lamp, 0.4), 0.12));
    dust.addColorStop(1, K.rgba(pal.ink, 0.16));
    x.fillStyle = dust; x.fillRect(0, floorY - H * 0.08, W, H - (floorY - H * 0.08));
    // dust motes caught in the lamp light (seeded scatter near the glow)
    x.save(); x.globalCompositeOperation = 'screen';
    for (let m = 0; m < motes; m++) {
      const mx = lampX + jit(lampR * 0.8), my = lampY + jit(lampR * 0.7);
      const ms = S * (0.001 + r() * 0.004);
      x.fillStyle = K.rgba(K.mix(hazeCol, '#ffffff', 0.3), 0.05 + r() * 0.10);
      x.beginPath(); x.arc(mx, my, ms, 0, 7); x.fill();
    }
    x.restore();
    // film grain + vignette to seat it as a painted, aged interior
    K.grain(x, W, H, 5.0, r);
    K.vignette(x, W, H, pal.name === 'Blue Hour Room' ? 0.46 : 0.36);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    // mirror draw()'s HEADER draw order EXACTLY: pal, mode, fmt, lampSide.
    const palPick = K.pick(PALS, r);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || palPick) : palPick;
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const lampSide = r() < 0.5 ? 'Lamp West' : 'Lamp East';
    const f = fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Room: mode, Format: f, Light: lampSide };
  }

  return { name: 'h4_eveningrooms', draw, traits };
})();
