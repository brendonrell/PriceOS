// @ts-nocheck
/*
 * LOADED QUESTION — production port of the R&D engine s02_pricediscussion.
 *
 * "The greatest meme the art world ever produced": where what art COSTS and
 * WHY became a community pastime. Rendered NOT as a Discord screenshot but as
 * a STYLIZED chat that behaves like weather — soft message lozenges drifting,
 * stacking, and DISSOLVING into haze; a conversation that is also a sky/smoke.
 *
 * STRAIGHT PORT of the approved R&D winner — nothing changed visually. The body
 * is identical to tools/halo/s02_pricediscussion.js; only the harness shell
 * differs: window.KIT → imported _kit helpers, window.FORCE_PAL removed, the
 * production blit()/EngineFn/TraitsFn/TraitSchema contract wired up.
 *
 * Deterministic from tokenId only.
 */
import { rng, pick, clamp, mix, rgba, makeNoise, bloom, mottle, softShadow, curl, hazeSheet, grain, vignette, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = { rng, pick, clamp, mix, rgba, makeNoise, bloom, mottle, softShadow, curl, hazeSheet, grain, vignette };

const PALS = [
  // ── the signature yellow-on-ink core ──
  { name: 'Attention',   dark: 1, ground: '#0d0d0f', bub: '#f7c400', bub2: '#3a3214', accent: '#ffd633', text: '#0d0d0f', textDim: '#e6d49a', smoke: '#f7c400' },
  { name: 'Carbon',      dark: 1, ground: '#141416', bub: '#42424d', bub2: '#2c2c34', accent: '#f4c623', text: '#0d0d0f', textDim: '#c8c8d2', smoke: '#aab0c0' },
  { name: 'Ink Gold',    dark: 1, ground: '#050505', bub: '#2a2a2e', bub2: '#1c1c20', accent: '#f5c542', text: '#050505', textDim: '#cfcfd6', smoke: '#d8c98a' },
  { name: 'Blueprint',   dark: 1, ground: '#0a1430', bub: '#1c2c52', bub2: '#142142', accent: '#ffd633', text: '#0a1430', textDim: '#b8c6e6', smoke: '#9fb4e0' },
  { name: 'Sodium',      dark: 1, ground: '#14110b', bub: '#33291a', bub2: '#241d12', accent: '#ffb02e', text: '#14110b', textDim: '#e6cfa0', smoke: '#ffb84d' },
  // ── dark rooms, other hues ──
  { name: 'After Hours', dark: 1, ground: '#0b1417', bub: '#1f3940', bub2: '#16292e', accent: '#e8a83f', text: '#0b1417', textDim: '#a8cfd0', smoke: '#e8a83f' },
  { name: 'Phosphor',    dark: 1, ground: '#0a120c', bub: '#1f3326', bub2: '#16271d', accent: '#7cffa0', text: '#07120b', textDim: '#9fd9b3', smoke: '#7cffa0' },
  { name: 'Cyan Wire',   dark: 1, ground: '#07141a', bub: '#163842', bub2: '#102832', accent: '#46e0ff', text: '#06141a', textDim: '#a7d8e6', smoke: '#46e0ff' },
  { name: 'Iris',        dark: 1, ground: '#100c1a', bub: '#2c2440', bub2: '#1f1930', accent: '#b18cff', text: '#0c0816', textDim: '#c8bbe6', smoke: '#b18cff' },
  { name: 'Rose Noir',   dark: 1, ground: '#15090f', bub: '#38202b', bub2: '#281620', accent: '#ff86b3', text: '#15090f', textDim: '#e6b4c6', smoke: '#ff86b3' },
  { name: 'Oxblood',     dark: 1, ground: '#160a0a', bub: '#3a1d1d', bub2: '#2a1414', accent: '#e8b34f', text: '#160a0a', textDim: '#d9a8a0', smoke: '#c97a5a' },
  { name: 'Ember Room',  dark: 1, ground: '#160f0c', bub: '#3a2620', bub2: '#2a1c18', accent: '#ff6a3d', text: '#160f0c', textDim: '#e0b3a0', smoke: '#ff7a4d' },
  { name: 'Static',      dark: 1, ground: '#1a1c20', bub: '#46586a', bub2: '#33424f', accent: '#ffd21a', text: '#0d0d0f', textDim: '#cdd9e4', smoke: '#9fb6c6' },
  // ── light papers, varied accents ──
  { name: 'Ledger',      dark: 0, ground: '#e7dcc4', bub: '#2c241d', bub2: '#473a2e', accent: '#8c3b2e', text: '#f0e7d3', textDim: '#f0e7d3', smoke: '#b7a988' },
  { name: 'Receipt',     dark: 0, ground: '#f2efe6', bub: '#d2cdc0', bub2: '#e0dbcf', accent: '#c2362b', text: '#f2efe6', textDim: '#6f6a5e', smoke: '#cfc8b8' },
  { name: 'Marigold',    dark: 0, ground: '#f3ead0', bub: '#e4d4ac', bub2: '#efe4c6', accent: '#d99a1f', text: '#2a2110', textDim: '#6e5f3a', smoke: '#d8c79a' },
  { name: 'Bone',        dark: 0, ground: '#ece8df', bub: '#d6d0c4', bub2: '#e2ddd2', accent: '#b23a2e', text: '#2a2620', textDim: '#6b665c', smoke: '#cfc8b8' },
  { name: 'Mint Paper',  dark: 0, ground: '#e9f0ea', bub: '#cfe0d4', bub2: '#dde9e0', accent: '#1f9d6b', text: '#10241a', textDim: '#5a7166', smoke: '#bcd2c4' },
  { name: 'Glacier',     dark: 0, ground: '#eaf0f4', bub: '#d2dde6', bub2: '#e0e8ee', accent: '#2f6fe0', text: '#14202c', textDim: '#5e6e7c', smoke: '#c2d2de' },
  { name: 'Slate Day',   dark: 0, ground: '#e4e7ea', bub: '#cdd3d8', bub2: '#dde1e4', accent: '#e08a2f', text: '#1a2026', textDim: '#5e6a72', smoke: '#c4ccd2' },
];

const MODES = ['Column', 'Crossfire', 'Swarm', 'Thread', 'Ticker', 'Dissolve'];
const FORMATS = [[1040, 1300], [1180, 1180], [1300, 1020]]; // portrait / square / landscape

const FRAGS = ['why this much?', '$6k', '$16k', 'price?', 'wen', 'ath', 'lol',
  'fk i miss those days', 'discuss', 'how much', 'too cheap', 'worth it?',
  'floor', '0.1', 'gm', 'why?', '$$$', 'sold', 'mint', 'paper hands'];
const USERS = ['rudxane', 'seventeen', 'willpop', 'siggi'];
const REACTS = ['◎', '◇', '△', '◯', '✦', '$'];

const WEATHER_MAP = {
  'Column': 'Drift', 'Crossfire': 'Exchange', 'Swarm': 'Cloudburst',
  'Thread': 'Branch', 'Ticker': 'Crawl', 'Dissolve': 'Evaporate',
};

function pickPal(r) {
  return K.pick(PALS, r);
}

/* A rounded lozenge path with an optional little tail. side: -1 left, +1 right. */
function bubblePath(x, bx, by, bw, bh, rad, tail, side) {
  const r = Math.min(rad, bh / 2, bw / 2);
  x.beginPath();
  x.moveTo(bx + r, by);
  x.lineTo(bx + bw - r, by);
  x.arcTo(bx + bw, by, bx + bw, by + r, r);
  x.lineTo(bx + bw, by + bh - r);
  x.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
  x.lineTo(bx + r, by + bh);
  x.arcTo(bx, by + bh, bx, by + bh - r, r);
  x.lineTo(bx, by + r);
  x.arcTo(bx, by, bx + r, by, r);
  x.closePath();
  if (tail) {
    const ty = by + bh - r * 0.5;
    x.moveTo(side < 0 ? bx + r : bx + bw - r, by + bh);
    if (side < 0) { x.lineTo(bx - r * 0.7, by + bh + r * 0.5); x.lineTo(bx + r * 1.2, ty); }
    else { x.lineTo(bx + bw + r * 0.7, by + bh + r * 0.5); x.lineTo(bx + bw - r * 1.2, ty); }
    x.closePath();
  }
}

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 3);
  const pal = pickPal(r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);

  // ── GROUND: subtle vertical gradient so the field has weather/depth ──
  const gTop = pal.dark ? K.mix(pal.ground, pal.smoke, 0.06) : K.mix(pal.ground, '#ffffff', 0.10);
  const gBot = pal.dark ? K.mix(pal.ground, '#000000', 0.30) : K.mix(pal.ground, pal.smoke, 0.12);
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, gTop); bg.addColorStop(1, gBot);
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // paper grounds get mottle (manila / bleached white)
  if (!pal.dark) K.mottle(x, 0, 0, W, H, pal.ground, 20, r, 'multiply');
  // a low, faint glow where the conversation is densest (the "warmth" of the room)
  K.bloom(x, W * (0.4 + r() * 0.2), H * (0.5 + r() * 0.25), S * 0.7, pal.smoke, pal.dark ? 0.06 : 0.04);

  /* draw one message lozenge with soft shadow, text, optional react chip.
     opts: side, fill, txtCol, frag (string|null), user (bool), react (string|null),
           alpha (0..1), melt (0..1 dissolve toward top) */
  function bubble(bx, by, bw, bh, opts) {
    const o = opts || {};
    const side = o.side || -1;
    const fill = o.fill || pal.bub;
    const alpha = o.alpha == null ? 1 : o.alpha;
    const rad = bh * 0.5 * (0.7 + r() * 0.3);
    const melt = o.melt || 0;

    // soft drop shadow under the bubble (depth)
    if (alpha > 0.25 && melt < 0.5) {
      K.softShadow(x, bx + bw / 2, by + bh + bh * 0.18, bw * 0.62, 0.16 * alpha * (1 - melt));
    }

    x.save();
    x.globalAlpha = alpha;
    // optional gentle rotation about the bubble centre (cloud scatter)
    if (o.rot) {
      x.translate(bx + bw / 2, by + bh / 2);
      x.rotate(o.rot);
      x.translate(-(bx + bw / 2), -(by + bh / 2));
    }
    // half-formed / melting bubbles fade & shear upward into steam
    if (melt > 0) {
      x.translate(0, -bh * melt * 0.6);
      x.globalAlpha = alpha * (1 - melt * 0.85);
    }
    bubblePath(x, bx, by, bw, bh, rad, o.tail !== false && melt < 0.4, side);
    // subtle inner gradient gives the lozenge volume
    const lg = x.createLinearGradient(bx, by, bx, by + bh);
    lg.addColorStop(0, K.mix(fill, '#ffffff', pal.dark ? 0.10 : 0.06));
    lg.addColorStop(1, K.mix(fill, '#000000', pal.dark ? 0.18 : 0.08));
    x.fillStyle = lg; x.fill();
    // thin rim light on top edge
    x.strokeStyle = K.rgba(K.mix(fill, '#ffffff', 0.4), 0.10 * (1 - melt)); x.lineWidth = 1.2; x.stroke();

    // username tiny label above the bubble
    if (o.user && melt < 0.3) {
      x.fillStyle = K.rgba(pal.textDim, 0.55 * alpha);
      x.font = (bh * 0.30 | 0) + 'px ui-monospace, monospace';
      x.textBaseline = 'alphabetic';
      x.fillText(K.pick(USERS, r), bx + rad * 0.6, by - bh * 0.16);
    }
    // fragment text inside the bubble (sparse, partly faded)
    if (o.frag && melt < 0.45) {
      const txt = o.frag;
      x.fillStyle = K.rgba(o.txtCol || pal.text, (0.92 - melt) * alpha);
      const fs = K.clamp(bh * 0.40, 11, 40) | 0;
      x.font = '600 ' + fs + 'px ui-monospace, monospace';
      x.textBaseline = 'middle';
      // clip overly long text into the bubble
      x.save();
      bubblePath(x, bx, by, bw, bh, rad, false, side);
      x.clip();
      x.fillText(txt, bx + rad * 0.7, by + bh * 0.54);
      x.restore();
    }
    x.restore();

    // reaction chip clinging to the bubble's lower corner
    if (o.react && melt < 0.35) {
      const cr = bh * 0.34;
      const cx = side < 0 ? bx + bw - cr * 0.3 : bx + cr * 0.3;
      const cyc = by + bh + cr * 0.1;
      x.save();
      K.softShadow(x, cx, cyc + cr * 0.4, cr * 1.6, 0.12 * alpha);
      x.globalAlpha = alpha;
      x.beginPath(); x.arc(cx, cyc, cr, 0, 7);
      x.fillStyle = K.mix(pal.ground, pal.accent, pal.dark ? 0.22 : 0.30); x.fill();
      x.strokeStyle = K.rgba(pal.accent, 0.55); x.lineWidth = 1.3; x.stroke();
      x.fillStyle = pal.accent;
      x.font = (cr * 1.05 | 0) + 'px ui-monospace, monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(o.react, cx, cyc + cr * 0.06);
      x.textAlign = 'left';
      x.restore();
    }
  }

  // helper: choose fill for a bubble — mostly dim mass, occasional yellow hit
  function fillFor(hot) {
    if (hot) return pal.accent;
    return r() < 0.5 ? pal.bub : pal.bub2;
  }

  // ── COMPOSE per mode ──
  if (mode === 'Column') {
    // single drifting chat column, lots of negative space + haze
    const colX = W * (0.30 + r() * 0.20);
    const colW = W * 0.40;
    let y = H * 0.10;
    let hotUsed = 0;
    while (y < H * 0.92) {
      const side = r() < 0.5 ? -1 : 1;
      const bw = colW * (0.45 + r() * 0.55);
      const bh = S * (0.045 + r() * 0.05);
      const bx = side < 0 ? colX : colX + colW - bw;
      // gentle horizontal drift via noise so the column breathes
      const drift = noise.fbm(y / 240, seed) * W * 0.06;
      const hot = hotUsed < 2 && r() < 0.18;
      if (hot) hotUsed++;
      const alpha = K.clamp(0.45 + r() * 0.5, 0.4, 0.95);
      bubble(bx + drift, y, bw, bh, {
        side, fill: fillFor(hot), txtCol: hot ? pal.text : pal.textDim,
        frag: r() < 0.55 ? K.pick(FRAGS, r) : null,
        user: r() < 0.4, react: r() < 0.3 ? K.pick(REACTS, r) : null, alpha,
      });
      y += bh * (1.5 + r() * 1.1);
    }
  } else if (mode === 'Crossfire') {
    // two columns left & right, converging — a back-and-forth
    for (const side of [-1, 1]) {
      const edge = side < 0 ? W * 0.06 : W * 0.94;
      let y = H * 0.10 + (side < 0 ? 0 : H * 0.06);
      let hotUsed = 0;
      while (y < H * 0.92) {
        const bw = W * (0.26 + r() * 0.16);
        const bh = S * (0.045 + r() * 0.045);
        const bx = side < 0 ? edge : edge - bw;
        const hot = hotUsed < 1 && r() < 0.16;
        if (hot) hotUsed++;
        const alpha = K.clamp(0.4 + r() * 0.5, 0.35, 0.92);
        bubble(bx, y, bw, bh, {
          side, fill: fillFor(hot), txtCol: hot ? pal.text : pal.textDim,
          frag: r() < 0.5 ? K.pick(FRAGS, r) : null,
          user: r() < 0.35, react: r() < 0.28 ? K.pick(REACTS, r) : null, alpha,
        });
        y += bh * (1.7 + r() * 1.2);
      }
    }
  } else if (mode === 'Swarm') {
    // bubbles massed into a cloud / weather form (no columns)
    const cx = W * (0.5 + (r() - 0.5) * 0.2), cy = H * (0.5 + (r() - 0.5) * 0.16);
    const n = 48 + (r() * 16 | 0);
    // sort by radius so larger sit behind smaller-ish — paint dim first
    const parts = [];
    for (let i = 0; i < n; i++) {
      const ang = r() * 7, rad = Math.pow(r(), 0.7) * S * 0.40;
      const ex = cx + Math.cos(ang) * rad * (1.25);
      const ey = cy + Math.sin(ang) * rad * 0.85;
      const dist = rad / (S * 0.40);
      parts.push({ ex, ey, dist });
    }
    parts.sort((a, b) => b.dist - a.dist);
    let hotUsed = 0;
    for (const p of parts) {
      const bw = S * (0.12 + r() * 0.18) * (1 - p.dist * 0.35);
      const bh = S * (0.045 + r() * 0.03);
      const side = r() < 0.5 ? -1 : 1;
      const hot = hotUsed < 3 && p.dist < 0.4 && r() < 0.22;
      if (hot) hotUsed++;
      const alpha = K.clamp((1 - p.dist) * 0.8 + 0.15, 0.18, 0.95);
      bubble(p.ex - bw / 2, p.ey - bh / 2, bw, bh, {
        side, fill: fillFor(hot), txtCol: hot ? pal.text : pal.textDim,
        frag: p.dist < 0.5 && r() < 0.45 ? K.pick(FRAGS, r) : null,
        tail: false, user: false, rot: (r() - 0.5) * 0.34,
        react: p.dist < 0.4 && r() < 0.25 ? K.pick(REACTS, r) : null,
        alpha, melt: p.dist > 0.66 ? (p.dist - 0.66) * 1.7 : 0,
      });
    }
  } else if (mode === 'Thread') {
    // one root bubble with branching replies + thin connectors
    const rootX = W * (0.16 + r() * 0.12), rootY = H * (0.16 + r() * 0.1);
    const rootW = W * 0.34, rootH = S * 0.085;
    // connectors first (under bubbles)
    const kids = [];
    const nk = 4 + (r() * 4 | 0);
    for (let i = 0; i < nk; i++) {
      const kx = rootX + W * (0.22 + r() * 0.5);
      const ky = rootY + H * (0.12 + (i + 1) / (nk + 1) * 0.66 + (r() - 0.5) * 0.06);
      kids.push({ kx, ky, kw: W * (0.18 + r() * 0.18), kh: S * (0.05 + r() * 0.03) });
    }
    x.save();
    x.strokeStyle = K.rgba(pal.textDim, pal.dark ? 0.30 : 0.40); x.lineWidth = 1.6;
    for (const k of kids) {
      x.beginPath();
      const sx = rootX + rootW * 0.5, sy = rootY + rootH;
      x.moveTo(sx, sy);
      x.bezierCurveTo(sx, (sy + k.ky) / 2, k.kx - W * 0.04, k.ky + k.kh / 2, k.kx, k.ky + k.kh / 2);
      x.stroke();
    }
    x.restore();
    bubble(rootX, rootY, rootW, rootH, { side: -1, fill: pal.accent, txtCol: pal.text, frag: K.pick(['why this much?', 'how much', 'price?'], r), user: true });
    let hotUsed = 0;
    for (const k of kids) {
      const hot = hotUsed < 1 && r() < 0.3; if (hot) hotUsed++;
      bubble(k.kx, k.ky, k.kw, k.kh, {
        side: 1, fill: fillFor(hot), txtCol: hot ? pal.text : pal.textDim,
        frag: r() < 0.7 ? K.pick(FRAGS, r) : null, user: r() < 0.5,
        react: r() < 0.4 ? K.pick(REACTS, r) : null, alpha: K.clamp(0.55 + r() * 0.4, 0.5, 0.95),
      });
    }
  } else if (mode === 'Ticker') {
    // horizontal price-talk band across the middle, fading at edges
    const bandY = H * (0.42 + (r() - 0.5) * 0.2);
    const bandH = S * 0.26;
    const rows = 3;
    for (let row = 0; row < rows; row++) {
      let bxp = -W * 0.1 + r() * W * 0.1;
      const ry = bandY - bandH / 2 + row * (bandH / rows) + bandH / rows * 0.1;
      const bh = bandH / rows * 0.72;
      let hotUsed = 0;
      while (bxp < W * 1.05) {
        const bw = W * (0.10 + r() * 0.14);
        const cxn = bxp + bw / 2;
        const edgeFade = K.clamp(1 - Math.abs(cxn - W / 2) / (W * 0.62), 0.1, 1);
        const hot = hotUsed < 2 && edgeFade > 0.7 && r() < 0.2; if (hot) hotUsed++;
        bubble(bxp, ry, bw, bh, {
          side: r() < 0.5 ? -1 : 1, fill: fillFor(hot), txtCol: hot ? pal.text : pal.textDim,
          frag: r() < 0.6 ? K.pick(FRAGS, r) : null, tail: false,
          react: r() < 0.22 ? K.pick(REACTS, r) : null, user: false,
          alpha: K.clamp(edgeFade * 0.9, 0.1, 0.92),
        });
        bxp += bw + W * (0.02 + r() * 0.04);
      }
    }
  } else { // Dissolve — bubbles evaporating into smoke up-frame
    const colX = W * (0.28 + r() * 0.22), colW = W * 0.44;
    let y = H * 1.0; // start at bottom, climb up
    let hotUsed = 0;
    while (y > -H * 0.05) {
      const t = 1 - y / H; // 0 bottom → 1 top
      const side = r() < 0.5 ? -1 : 1;
      const bw = colW * (0.4 + r() * 0.55) * (1 - t * 0.3);
      const bh = S * (0.05 + r() * 0.04);
      const drift = (noise.fbm(y / 200, seed * 0.3) ) * W * 0.10 * t;
      const bx = (side < 0 ? colX : colX + colW - bw) + drift;
      const hot = hotUsed < 2 && t < 0.4 && r() < 0.2; if (hot) hotUsed++;
      const melt = K.clamp((t - 0.35) * 1.5, 0, 0.95);
      bubble(bx, y, bw, bh, {
        side, fill: fillFor(hot), txtCol: hot ? pal.text : pal.textDim,
        frag: t < 0.5 && r() < 0.6 ? K.pick(FRAGS, r) : null,
        user: t < 0.3 && r() < 0.4, react: t < 0.35 && r() < 0.3 ? K.pick(REACTS, r) : null,
        alpha: K.clamp(0.5 + r() * 0.45, 0.3, 0.95), melt,
      });
      y -= bh * (1.4 + r() * 1.0);
    }
  }

  // ── RISING STEAM / SMOKE: curl-driven wisps off the conversation ──
  const wisps = mode === 'Dissolve' || mode === 'Swarm' ? 5 : 3;
  x.save();
  x.globalCompositeOperation = pal.dark ? 'screen' : 'multiply';
  for (let i = 0; i < wisps; i++) {
    let px = W * (0.2 + r() * 0.6), py = H * (0.55 + r() * 0.4);
    x.beginPath(); x.moveTo(px, py);
    const steps = 26 + (r() * 14 | 0);
    for (let s = 0; s < steps; s++) {
      const c = K.curl(noise, px, py, 2);
      px += c[0] * 22 + (r() - 0.5) * 3;
      py += c[1] * 22 - 8; // bias upward
      x.lineTo(px, py);
    }
    x.lineWidth = S * (0.012 + r() * 0.024);
    x.strokeStyle = K.rgba(pal.smoke, pal.dark ? 0.07 : 0.05);
    x.lineCap = 'round'; x.stroke();
  }
  x.restore();

  // ── ATMOSPHERE & TEXTURE GRADE ──
  const hazeCol = K.mix(pal.smoke, pal.ground, pal.dark ? 0.3 : 0.5);
  K.hazeSheet(x, W, H, noise, hazeCol, pal.dark ? 0.20 : 0.14, S * 0.85, pal.dark ? 'screen' : 'multiply');
  // top haze band — the conversation literally dissolving into sky
  const th = x.createLinearGradient(0, 0, 0, H * 0.4);
  th.addColorStop(0, K.rgba(pal.smoke, pal.dark ? 0.14 : 0.10));
  th.addColorStop(1, K.rgba(pal.smoke, 0));
  x.save(); x.globalCompositeOperation = pal.dark ? 'screen' : 'multiply';
  x.fillStyle = th; x.fillRect(0, 0, W, H * 0.4); x.restore();

  K.grain(x, W, H, 5.2, r);
  K.vignette(x, W, H, pal.dark ? 0.30 : 0.18);
}

export const loadedQuestionTraits: TraitsFn = (seed) => {
  const r = K.rng(seed);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  return { Palette: pal.name, Mode: mode, Format: f, Weather: WEATHER_MAP[mode] };
};

export const loadedQuestionSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Mode',    values: MODES },
    { name: 'Format',  values: ['Portrait', 'Square', 'Landscape'] },
    { name: 'Weather', values: MODES.map((m) => WEATHER_MAP[m]) },
  ],
};

export const renderLoadedQuestion: EngineFn = blit(draw, loadedQuestionTraits);

// W/H of portrait / square / landscape (matches FORMATS order).
export const LOADEDQUESTION_ASPECTS = [1040 / 1300, 1, 1300 / 1020] as const;
