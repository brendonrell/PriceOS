/* DEAD RECKONING — a surveyor's chalk-line and plumb-bob set, the kind used
 * to true a wall before drywall goes up: string snapped taut, bob hanging
 * dead-still under its own weight to show true vertical. The one wrong
 * detail: the bob hangs a few degrees off true while the string reads
 * perfectly straight and taut to the eye, and the chalk line already snapped
 * on the wall agrees with the tilted bob, not with vertical — as if plumb
 * itself has been quietly redefined.
 *
 * THE LIE IS STRUCTURAL, NOT TEXTURAL: true vertical is computed first as an
 * invisible reference, then the entire bob+string assembly is rigidly
 * rotated around the anchor by theta (4-9deg, seeded sign). The string stays
 * mathematically straight (zero sag, zero catenary, Bresenham-quality single
 * vector) the whole time — it just no longer points down. A set of faint
 * horizontal reference lines (true horizontal, seeded spacing) sits behind it
 * so the eye has something to check the tilt against. A second, fainter
 * "ghost" chalk line is already snapped on the wall at the BOB's wrong angle,
 * not true vertical — the mark has already been made from the false plumb.
 *
 * Layer 1 (GROUND): flat zinc-grey wall / overcast sky, very low-frequency
 *          2-3 octave fbm wash, tiny amplitude, narrow mid-key clamp — cast
 *          concrete / fog, no banding.
 * Layer 2 (GEOMETRY): fixed anchor near top; dead-straight string to a
 *          plumb-bob (cone-on-sphere: arcs + tapered polygon) at angle theta
 *          off vertical. Layer 2b: 1-3 faint true-horizontal reference lines.
 * Layer 3 (ATMOSPHERE): soft diffuse drop-shadow (stacked low-alpha blur
 *          passes, overcast daylight, no hard sun), a second faint ghost
 *          chalk line snapped at the bob's wrong angle terminating on the
 *          wall, and a light grain/noise pass for the concrete-and-zinc read.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * KIT is preloaded as window.KIT. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Exact named palette, baked in.
  const PALS = [
    { hex: '#9AA7AC', name: 'Zinc Fog' },
    { hex: '#7E8C91', name: 'Overcast Steel' },
    { hex: '#5C6A6E', name: 'Wet Slate' },
    { hex: '#C7CDCB', name: 'Chalk Dust' },
    { hex: '#3F4A4D', name: 'Formwork Shadow' },
    { hex: '#A8B2AE', name: 'Cement Pale' },
    { hex: '#6B7679', name: 'Cord Grey' },
    { hex: '#D8DCD9', name: 'Vapor White' },
    { hex: '#2E373A', name: 'Anchor Dark' },
  ];
  const ZINC_FOG = PALS[0].hex;
  const OVERCAST_STEEL = PALS[1].hex;
  const WET_SLATE = PALS[2].hex;
  const CHALK_DUST = PALS[3].hex;
  const FORMWORK_SHADOW = PALS[4].hex;
  const CEMENT_PALE = PALS[5].hex;
  const CORD_GREY = PALS[6].hex;
  const VAPOR_WHITE = PALS[7].hex;
  const ANCHOR_DARK = PALS[8].hex;

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 11 + 3);

    // ── FORMAT: portrait-biased, continuous within band. ──
    const aspect = 0.58 + r() * 0.22; // 0.58 .. 0.80, portrait
    const LONG = 1180;
    const W = Math.round(LONG * aspect), H = LONG;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── DECISION BLOCK — fixed rng order, mirrored exactly by traits(). ──
    const bobShapeIdx = r() * 3 | 0;                  // 0 cone, 1 teardrop, 2 faceted hex
    const thetaDeg = 4 + r() * 5;                      // 4..9 degrees off vertical
    const thetaSign = r() < 0.5 ? -1 : 1;              // sign randomized
    const refLineCount = 1 + (r() * 3 | 0);            // 1..3 horizontal reference lines
    const shadowSoftness = r();                        // 0..1, drives blur passes + length
    const anchorXFrac = 0.38 + r() * 0.24;
    const anchorYFrac = 0.06 + r() * 0.07;
    const stringLenFrac = 0.56 + r() * 0.24;
    // ── end decision block ──

    paintGround(x, W, H, S, noise, r);

    const anchorX = W * anchorXFrac, anchorY = H * anchorYFrac;
    const stringLen = H * stringLenFrac;

    // true-vertical reference computed first (invisible) — then the entire
    // assembly is rotated rigidly around the anchor by theta.
    const trueEndX = anchorX, trueEndY = anchorY + stringLen;
    const theta = (thetaDeg * thetaSign) * Math.PI / 180;
    const dx0 = trueEndX - anchorX, dy0 = trueEndY - anchorY;
    const bobX = anchorX + dx0 * Math.cos(theta) - dy0 * Math.sin(theta);
    const bobY = anchorY + dx0 * Math.sin(theta) + dy0 * Math.cos(theta);

    drawHorizontalReferenceLines(x, W, H, S, noise, r, refLineCount, anchorY, trueEndY);
    drawAtmosphereShadow(x, S, anchorX, anchorY, bobX, bobY, shadowSoftness);
    drawGhostChalkLine(x, W, H, S, anchorX, anchorY, bobX, bobY, theta);
    drawString(x, S, anchorX, anchorY, bobX, bobY);
    drawPlumbBob(x, S, anchorX, anchorY, bobX, bobY, theta, bobShapeIdx, r);

    grainPass(x, W, H, r);
    K.vignette(x, W, H, 0.20);

    return { aspect: W / H };
  }

  /* ── LAYER 1: GROUND — flat zinc-grey wall / overcast sky field, very
        low-frequency 2-3 octave fbm wash, tiny amplitude, value range
        deliberately clamped to a narrow mid-key band — cast concrete or fog,
        no gradient banding. ── */
  function paintGround(x, W, H, S, noise, r) {
    // narrow mid-key base fill, no gradient — the wash does all the work.
    x.fillStyle = OVERCAST_STEEL;
    x.fillRect(0, 0, W, H);

    const scale = S * (1.1 + r() * 0.4); // very low frequency
    const step = Math.max(3, Math.floor(S / 200));
    const amp = 0.05; // tiny amplitude, clamped narrow mid-key
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.fbm(xx / scale, yy / scale, 3, 0.5, 2.0); // 2-3 octaves
        const t = K.clamp(0.5 + n * amp, 0.42, 0.58); // narrow mid-key clamp
        const col = t < 0.5 ? K.mix(OVERCAST_STEEL, FORMWORK_SHADOW, (0.5 - t) * 2) : K.mix(OVERCAST_STEEL, CEMENT_PALE, (t - 0.5) * 2);
        x.fillStyle = col;
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }

    // very faint secondary wash pass for cast-concrete depth, still narrow band
    x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.06;
    for (let yy = 0; yy < H; yy += step * 2) {
      for (let xx = 0; xx < W; xx += step * 2) {
        const n = (noise.fbm(xx / (scale * 0.5) + 50, yy / (scale * 0.5) + 50, 2, 0.5, 2.0) + 1) / 2;
        x.fillStyle = K.rgba(WET_SLATE, n * 0.5);
        x.fillRect(xx, yy, step * 2 + 1, step * 2 + 1);
      }
    }
    x.restore();
  }

  /* ── LAYER 2b: 1-3 faint horizontal chalk/formwork lines drawn at true
        horizontal, seeded spacing — gives the eye a true-vertical reference
        to compare the tilted assembly against. ── */
  function drawHorizontalReferenceLines(x, W, H, S, noise, r, count, anchorY, trueEndY) {
    x.save();
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const yc = anchorY + (trueEndY - anchorY) * (0.35 + t * 0.85) + H * 0.02 * r();
      const yy = K.clamp(yc, H * 0.08, H * 0.94);
      const jx = (r() - 0.5) * S * 0.01;
      x.strokeStyle = K.rgba(CHALK_DUST, 0.16 + r() * 0.10);
      x.lineWidth = 1 + (r() < 0.3 ? 1 : 0);
      x.setLineDash(r() < 0.4 ? [S * 0.01, S * 0.008] : []);
      x.beginPath();
      x.moveTo(W * 0.04 + jx, yy);
      x.lineTo(W * 0.96 + jx, yy);
      x.stroke();
    }
    x.setLineDash([]);
    x.restore();
  }

  /* ── LAYER 3: soft directional drop-shadow cast from the string and bob
        onto the wall — offset and blurred via a stacked low-alpha multi-pass
        blur to simulate flat overcast daylight (diffuse only, no hard sun
        shadow). ── */
  function drawAtmosphereShadow(x, S, ax, ay, bx, by, softness) {
    const offX = S * (0.02 + softness * 0.018);
    const offY = S * 0.012;
    const passes = 4 + (softness * 3 | 0);
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.lineCap = 'round';
    for (let i = 0; i < passes; i++) {
      const t = i / (passes - 1);
      const w = S * (0.004 + t * 0.026 * (0.5 + softness));
      const a = (0.045 - t * 0.034) * (0.6 + softness * 0.5);
      x.strokeStyle = K.rgba(FORMWORK_SHADOW, Math.max(a, 0.003));
      x.lineWidth = w;
      x.beginPath();
      x.moveTo(ax + offX * 0.25, ay + offY * 0.25);
      x.lineTo(bx + offX, by + offY);
      x.stroke();
    }
    // soft bob shadow blob
    K.softShadow(x, bx + offX, by + offY + S * 0.01, S * (0.05 + softness * 0.02), 0.10 + softness * 0.06);
    x.restore();
  }

  /* ── the chalk line already snapped on the wall agrees with the tilted bob,
        not with vertical — a second straight line, lower opacity, drawn at
        the bob's wrong angle and terminating further down the wall, as if
        the mark has already been made from the false plumb. ── */
  function drawGhostChalkLine(x, W, H, S, ax, ay, bx, by, theta) {
    const dirX = bx - ax, dirY = by - ay;
    const len = Math.hypot(dirX, dirY);
    const ux = dirX / len, uy = dirY / len;
    const extend = H - by + S * 0.08;
    const endX = bx + ux * extend;
    const endY = by + uy * extend;
    x.save();
    x.strokeStyle = K.rgba(CORD_GREY, 0.22);
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(ax, ay);
    x.lineTo(Math.min(Math.max(endX, 0), W), Math.min(endY, H * 0.998));
    x.stroke();
    // faint chalk dust scatter along the snapped line
    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const px = ax + (endX - ax) * t, py = ay + (endY - ay) * t;
      if (py > H) continue;
      x.fillStyle = K.rgba(CHALK_DUST, 0.05 + 0.05 * Math.sin(t * 9));
      x.fillRect(px - 0.5, py - 0.5, 1, 1);
    }
    x.restore();
  }

  /* ── LAYER 2: THE STRING — a perfectly straight Bresenham-quality line
        (zero sag, zero catenary) from anchor to the rotated bob position. ── */
  function drawString(x, S, ax, ay, bx, by) {
    x.save();
    x.lineCap = 'round';
    // low-alpha bloom underlay reads as taut wire catching flat daylight
    x.strokeStyle = K.rgba(VAPOR_WHITE, 0.14);
    x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
    // crisp 1px core — mathematically straight
    x.strokeStyle = K.rgba(CORD_GREY, 0.92);
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();

    // anchor fixture
    x.fillStyle = K.rgba(ANCHOR_DARK, 0.9);
    x.beginPath(); x.arc(ax, ay, S * 0.009, 0, 7); x.fill();
    x.strokeStyle = K.rgba(VAPOR_WHITE, 0.3);
    x.lineWidth = 1;
    x.beginPath(); x.arc(ax, ay, S * 0.009, 0, 7); x.stroke();
    x.restore();
  }

  /* ── LAYER 2: THE PLUMB BOB — cone-on-sphere or faceted variant, built from
        arcs + a tapered polygon, drawn at the rotated (off-true) position and
        oriented along the string's own (tilted) axis. ── */
  function drawPlumbBob(x, S, ax, ay, bx, by, theta, shapeIdx, r) {
    const bobLen = S * (0.10 + r() * 0.03);
    const bobR = S * (0.026 + r() * 0.008);
    const ang = Math.atan2(by - ay, bx - ax);

    x.save();
    x.translate(bx, by);
    x.rotate(ang - Math.PI / 2); // aligned to the string's own axis, i.e. off true

    if (shapeIdx === 0) paintCone(x, bobR, bobLen);
    else if (shapeIdx === 1) paintTeardrop(x, bobR, bobLen);
    else paintFacetedHex(x, bobR, bobLen);

    // edge stroke + sheen so the bob reads crisp and solid
    x.strokeStyle = K.rgba(ANCHOR_DARK, 0.55);
    x.lineWidth = 1;
    if (shapeIdx === 0) strokeConeOutline(x, bobR, bobLen);
    else if (shapeIdx === 1) strokeTeardropOutline(x, bobR, bobLen);
    else strokeFacetedHexOutline(x, bobR, bobLen);

    x.save(); x.globalCompositeOperation = 'lighter';
    K.sheen(x, -bobR * 0.32, bobLen * 0.2, bobR * 0.85, VAPOR_WHITE, 0.28);
    x.restore();

    // working tip point
    x.fillStyle = ANCHOR_DARK;
    x.beginPath(); x.arc(0, bobLen, S * 0.0036, 0, 7); x.fill();
    x.restore();
  }

  function bobGradient(x, R) {
    const grad = x.createLinearGradient(-R, 0, R, 0);
    grad.addColorStop(0, K.mix(ZINC_FOG, ANCHOR_DARK, 0.45));
    grad.addColorStop(0.45, ZINC_FOG);
    grad.addColorStop(0.55, K.mix(ZINC_FOG, VAPOR_WHITE, 0.4));
    grad.addColorStop(1, K.mix(ZINC_FOG, ANCHOR_DARK, 0.45));
    return grad;
  }

  // cone-on-sphere: rounded collar (sphere arc) tapering to a point (cone).
  function paintCone(x, R, L) {
    x.fillStyle = bobGradient(x, R);
    const collarY = L * 0.26;
    x.beginPath();
    x.arc(0, collarY * 0.55, R, Math.PI, 0, false); // sphere cap
    x.lineTo(R * 0.96, collarY);
    x.lineTo(0, L);
    x.lineTo(-R * 0.96, collarY);
    x.closePath();
    x.fill();
  }
  function strokeConeOutline(x, R, L) {
    const collarY = L * 0.26;
    x.beginPath();
    x.arc(0, collarY * 0.55, R, Math.PI, 0, false);
    x.lineTo(R * 0.96, collarY);
    x.lineTo(0, L);
    x.lineTo(-R * 0.96, collarY);
    x.closePath();
    x.stroke();
  }

  // teardrop: full rounded bulb up top, drawing down to a fine point.
  function paintTeardrop(x, R, L) {
    x.fillStyle = bobGradient(x, R);
    x.beginPath();
    const bulbY = L * 0.32;
    x.moveTo(0, L);
    x.bezierCurveTo(R * 1.05, L * 0.78, R * 1.1, bulbY * 0.2, 0, bulbY * -0.55);
    x.bezierCurveTo(-R * 1.1, bulbY * 0.2, -R * 1.05, L * 0.78, 0, L);
    x.closePath();
    x.fill();
  }
  function strokeTeardropOutline(x, R, L) {
    const bulbY = L * 0.32;
    x.beginPath();
    x.moveTo(0, L);
    x.bezierCurveTo(R * 1.05, L * 0.78, R * 1.1, bulbY * 0.2, 0, bulbY * -0.55);
    x.bezierCurveTo(-R * 1.1, bulbY * 0.2, -R * 1.05, L * 0.78, 0, L);
    x.closePath();
    x.stroke();
  }

  // faceted hex: angular hexagonal collar tapering to a point — faceted-metal read.
  function paintFacetedHex(x, R, L) {
    x.fillStyle = bobGradient(x, R);
    const collarY = L * 0.3;
    const pts = [];
    const facets = 6;
    for (let i = 0; i <= facets; i++) {
      const a = Math.PI * (i / facets);
      pts.push([Math.cos(a) * -R, collarY - Math.sin(a) * R * 0.5]);
    }
    pts.push([0, L]);
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    x.fill();
  }
  function strokeFacetedHexOutline(x, R, L) {
    const collarY = L * 0.3;
    const pts = [];
    const facets = 6;
    for (let i = 0; i <= facets; i++) {
      const a = Math.PI * (i / facets);
      pts.push([Math.cos(a) * -R, collarY - Math.sin(a) * R * 0.5]);
    }
    pts.push([0, L]);
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
    x.stroke();
  }

  /* ── light grain/noise pass for the concrete-and-zinc material read ── */
  function grainPass(x, W, H, r) {
    K.grain(x, W, H, 10, r);
  }

  function traits(seed) {
    const r = K.rng(seed);
    K.makeNoise(seed * 11 + 3); // mirrors draw()'s noise instantiation (no rng consumed)
    r(); // aspect
    const bobShapeIdx = r() * 3 | 0;
    const thetaDeg = 4 + r() * 5;
    const thetaSign = r() < 0.5 ? -1 : 1;
    const refLineCount = 1 + (r() * 3 | 0);
    const shadowSoftness = r();
    const shapeNames = ['Cone', 'Teardrop', 'Faceted Hex'];
    return {
      Bob: shapeNames[bobShapeIdx],
      Tilt: thetaDeg.toFixed(1) + '° ' + (thetaSign < 0 ? 'Left' : 'Right'),
      Lines: String(refLineCount),
      Shadow: shadowSoftness < 0.34 ? 'Crisp' : shadowSoftness < 0.67 ? 'Soft' : 'Hazy',
    };
  }

  return { name: 'v3_dead-reckoning', draw, traits };
})();
