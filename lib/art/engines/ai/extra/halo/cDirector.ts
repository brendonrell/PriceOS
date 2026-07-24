// @ts-nocheck
/*
 * HALO — "GRIDLOCK" by cDirector-ai. AERIAL NODE-METROPOLIS.
 * ════════════════════════════════════════════════════════════════════════════
 * A teeming circuit-city seen from above at night: a living mainframe rendered as
 * a metropolis. Districts of glowing nodes, data buses streaking between them,
 * ring-roads, substations, dense packed blocks — a sprawling network from a drone
 * a thousand metres up, hazed by the city's own light pollution. This is NOT
 * outrun: no sunset, no horizon, no chrome, no single neon grid receding to a
 * vanishing point. It is a TOP-DOWN / faintly-iso mainframe, busy and deep, a
 * console-city where the traffic is data.
 *
 * CONCEPT — the platform's flagship reads as a circuit board that became a city:
 * every "building" is a node/chip, every "road" is a bus/trace, traffic packets
 * race the lines, substations bloom, scanlines and hex-rain wash the whole frame
 * in CRT phosphor. Atmospheric haze + layered scales sell EPIC sprawl and depth.
 *
 * LAYOUT is the PRIMARY trait — SIX structurally distinct city forms, each its
 * own draw routine (not one city relocated):
 *   1. Radial Core   — a blazing downtown core; ring-roads + radial spokes fan
 *                      out to a dense halo of districts. A capital seen from orbit.
 *   2. Grid Sprawl   — an endless Manhattan/circuit lattice of packed blocks, bus
 *                      avenues, allover density to every edge. No hero, pure mass.
 *   3. River Delta   — fat trunk buses branch like a river delta of light across
 *                      the frame, districts clustering on the banks. Flow as form.
 *   4. Constellation — discrete districts scattered on phi/thirds points, long
 *                      inter-district trunk-lines wiring them — a sparse network,
 *                      generous dark between, deepest haze.
 *   5. Iso Skyline   — a faint isometric tilt: packed iso block-towers casting the
 *                      city into shallow 3-D, buses threading the canyons, depth
 *                      stacked front-to-back.
 *   6. Ring World    — concentric ring-districts (a circular mainframe / O'Neill
 *                      ring); orbital buses sweep the arcs, spokes cross them.
 *
 * PALETTES — 10 SATURATED CRT colourways. Deep dark grounds, electric jewel neon,
 * disciplined per palette (neon = primary trace, hot = packet/bloom accent,
 * deep = secondary district, haze = atmospheric light-pollution wash):
 *   Acid Terminal, Magenta Mainframe, Sodium Override, Plasma Core, Ion Drift,
 *   Toxic Subnet, Blood Protocol, Arctic Daemon, Spectrum Bus, Ember Grid.
 *
 * WHY IT'S HALO-WORTHY: density IS the feature — thousands of nodes, traces and
 * packets per seed, hazed into atmospheric depth so it never flattens; six wholly
 * different urban forms so seeds diverge dramatically; a coherent cyberpunk-
 * terminal identity (phosphor, bus, hex-rain, scanline, bloom) that no other piece
 * on the platform owns. Composite-op glow keeps thousands of elements cheap.
 *
 * Deterministic from tokenId only. ALL trait randomness drawn in paramsOf() in a
 * FIXED order so traits() and draw() never disagree. mix() is COLOURS only.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, paperTooth, blit, PHI, INVPHI } from '../_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../../project/types';

/* ── Palettes — 10 saturated CRT colourways ──────────────────────────────────
 * ground : deep dark base (city void)
 * neon   : primary trace / dominant bus colour
 * hot    : hottest accent — packets, substation cores, district highlights
 * deep   : secondary / cooler district colour for variety within a frame
 * haze   : atmospheric light-pollution wash that builds depth
 * grid   : faint substrate lattice (the circuit board under the city) */
const PALS = [
  { name: 'Acid Terminal',    ground: '#03100a', neon: '#1bff8c', hot: '#d6ff3b', deep: '#0bd0c4', haze: '#0a6b4a', grid: '#0e3a2a' },
  { name: 'Magenta Mainframe',ground: '#0c0418', neon: '#ff2bd0', hot: '#ffd23f', deep: '#7a3bff', haze: '#5a1a6b', grid: '#2a103a' },
  { name: 'Sodium Override',  ground: '#120802', neon: '#ffb019', hot: '#ff3b2b', deep: '#ff6fae', haze: '#7a3a08', grid: '#3a2206' },
  { name: 'Plasma Core',      ground: '#04081c', neon: '#3b7bff', hot: '#19e6ff', deep: '#b04bff', haze: '#1a2a7a', grid: '#0e1a44' },
  { name: 'Ion Drift',        ground: '#02141a', neon: '#19e6ff', hot: '#7dff6b', deep: '#3b7bff', haze: '#0a5a6b', grid: '#0a2e3a' },
  { name: 'Toxic Subnet',     ground: '#0a1202', neon: '#a6ff1b', hot: '#19ffd2', deep: '#ffe83b', haze: '#3a5a08', grid: '#1e3406' },
  { name: 'Blood Protocol',   ground: '#160206', neon: '#ff2b4e', hot: '#ff9b1b', deep: '#ff5fae', haze: '#6b0a1a', grid: '#3a0a14' },
  { name: 'Arctic Daemon',    ground: '#040c14', neon: '#5cf0ff', hot: '#e8f6ff', deep: '#3b9bff', haze: '#1a4a6b', grid: '#0e2438' },
  { name: 'Spectrum Bus',     ground: '#070314', neon: '#19ffb0', hot: '#ff3bd0', deep: '#ffd23f', haze: '#2a1a6b', grid: '#1a1240' },
  { name: 'Ember Grid',       ground: '#140602', neon: '#ff6a19', hot: '#ffe03b', deep: '#ff2b6f', haze: '#6b2a08', grid: '#3a1606' },
];

/* Formats — real W/H ratios live in HALOC_ASPECTS below (same order). */
const FMTS = [
  { W: 1280, H: 1280, t: 'Square' },
  { W: 1040, H: 1320, t: 'Tall' },
  { W: 1320, H: 1040, t: 'Wide' },
];

/* PRIMARY composition trait — each value is a different draw routine. */
const LAYOUTS = ['Radial Core', 'Grid Sprawl', 'River Delta', 'Constellation', 'Iso Skyline', 'Ring World'];

const DENSITY = ['Sparse', 'Packed', 'Megacity']; // node/bus count multiplier
const TRAFFIC = ['Calm', 'Rush', 'Overload'];     // packet density on the buses
const HAZE    = ['Clear', 'Smog'];                // atmospheric depth strength

/* ── Param draw (FIXED ORDER — Layout FIRST) ──────────────────────────────── */
function paramsOf(r) {
  const layout  = pick(LAYOUTS, r);
  const palI    = Math.floor(r() * PALS.length);
  const fmt     = pick(FMTS, r);
  const density = pick(DENSITY, r);
  const traffic = pick(TRAFFIC, r);
  const haze    = pick(HAZE, r);
  return { layout, palI, fmt, density, traffic, haze };
}

function labels(p) {
  return {
    Layout:  p.layout,
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Density: p.density,
    Traffic: p.traffic,
    Haze:    p.haze,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 * DRAWN-ELEMENT BUDGET — gallery-jank guard.
 * ──────────────────────────────────────────────────────────────────────────
 * Every node draws a radial-gradient bloom (the dominant per-element cost), so
 * the worst seed is bounded by the total NODE count, not the layout. At normal
 * densities a frame draws well under this ceiling, so the look is untouched; only
 * the runaway Megacity×Overload extremes (Grid Sprawl per-cell, Ring World
 * per-seat district explosions) ever hit it and get thinned. Comparable
 * discipline to GLYPHSTORM's ~6500 drawn-mark cap.
 *
 * BUDGET is the global node ceiling per frame; nodeBudget() is decremented as
 * districts request nodes and hands back only what's left, so a frame can never
 * exceed it regardless of cell/seat count. Reset once per draw().
 */
const NODE_BUDGET = 6500;
const _budget = { nodes: 0 };
function resetBudget() { _budget.nodes = 0; }
/* clamp a requested node count to whatever budget remains. */
function nodeBudget(want) {
  if (_budget.nodes >= NODE_BUDGET) return 0;
  const give = Math.min(want, NODE_BUDGET - _budget.nodes);
  _budget.nodes += give;
  return give;
}

/* ════════════════════════════════════════════════════════════════════════════
 * SHARED PRIMITIVES — the circuit-city building blocks every layout composes.
 * ══════════════════════════════════════════════════════════════════════════ */

/* A glowing node / chip: dark body, neon outline, bright core, soft bloom. */
function node(x, P, cx, cy, s, col, lit) {
  // bloom halo (screen) — cheap soft glow
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, s * 2.6);
  g.addColorStop(0, rgba(col, lit ? 0.55 : 0.22));
  g.addColorStop(0.4, rgba(col, lit ? 0.18 : 0.07));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(cx - s * 2.6, cy - s * 2.6, s * 5.2, s * 5.2);
  x.restore();
  // chip body
  x.fillStyle = rgba(mix(P.ground, '#000', 0.3), 0.92);
  x.fillRect(cx - s, cy - s, s * 2, s * 2);
  // neon edge
  x.strokeStyle = rgba(col, lit ? 0.95 : 0.5);
  x.lineWidth = Math.max(0.6, s * 0.22);
  x.strokeRect(cx - s, cy - s, s * 2, s * 2);
  // hot core
  if (lit) {
    x.fillStyle = rgba(mix(col, '#ffffff', 0.5), 0.85);
    x.fillRect(cx - s * 0.34, cy - s * 0.34, s * 0.68, s * 0.68);
  }
}

/* A bus / trace between two points: dark gutter + bright phosphor line + glow. */
function bus(x, P, x0, y0, x1, y1, w, col, glow) {
  if (glow) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(col, 0.16);
    x.lineCap = 'round';
    x.lineWidth = w * 3.4;
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.restore();
  }
  x.strokeStyle = rgba(col, 0.9);
  x.lineCap = 'round';
  x.lineWidth = w;
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
}

/* A right-angled (Manhattan) trace — circuit-board routing, not a straight diag. */
function trace(x, P, x0, y0, x1, y1, w, col, r) {
  const midFirstX = r() < 0.5;
  x.strokeStyle = rgba(col, 0.8);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.lineWidth = w;
  x.beginPath();
  x.moveTo(x0, y0);
  if (midFirstX) { x.lineTo(x1, y0); x.lineTo(x1, y1); }
  else           { x.lineTo(x0, y1); x.lineTo(x1, y1); }
  x.stroke();
}

/* Traffic packets streaking along a line — bright dashes of moving data. */
function packets(x, P, x0, y0, x1, y1, n, col, sz, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const t = r();
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const ln = sz * (1.6 + r() * 2.4);
    const c = r() < 0.5 ? col : mix(col, '#ffffff', 0.4);
    x.strokeStyle = rgba(c, 0.7 + r() * 0.3);
    x.lineCap = 'round';
    x.lineWidth = sz * (0.5 + r() * 0.5);
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(ang) * ln, py + Math.sin(ang) * ln);
    x.stroke();
  }
  x.restore();
}

/* A substation: a big radial bloom with a hot core — district power hub. */
function substation(x, P, cx, cy, rad, col) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(mix(col, '#ffffff', 0.5), 0.5));
  g.addColorStop(0.25, rgba(col, 0.28));
  g.addColorStop(0.6, rgba(col, 0.08));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  x.restore();
}

/* A district: a cluster of nodes wired by short traces around an anchor. */
function district(x, P, cx, cy, rad, count, traffic, r) {
  const cols = [P.neon, P.deep, P.hot];
  const dcol = pick(cols, r);
  // a couple of internal substations
  if (r() < 0.6) substation(x, P, cx, cy, rad * (0.6 + r() * 0.5), dcol);
  // Clamp the requested node count to the global frame budget. A single district
  // also can't exceed PER_DISTRICT_CAP, so one giant cluster can't drain it all
  // and starve the rest of the city. Determinism is preserved: we still consume
  // the same RNG draws per attempted node (the continue path below), only the
  // bloom-heavy node() calls are bounded.
  const PER_DISTRICT_CAP = 90;
  count = nodeBudget(Math.min(count, PER_DISTRICT_CAP));
  const nodes = [];
  for (let i = 0; i < count; i++) {
    // pack on a jittered local grid so it reads as blocks, not a blob
    const gx = (Math.floor(r() * 5) - 2);
    const gy = (Math.floor(r() * 5) - 2);
    const nx = cx + gx * rad * 0.32 + randn(r) * rad * 0.06;
    const ny = cy + gy * rad * 0.32 + randn(r) * rad * 0.06;
    if (Math.hypot(nx - cx, ny - cy) > rad * 1.25) continue;
    nodes.push([nx, ny]);
  }
  // wire neighbours with short traces (the block streets)
  for (let i = 0; i < nodes.length; i++) {
    if (r() < 0.55 && i > 0) {
      const j = Math.floor(r() * i);
      trace(x, P, nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1],
            Math.max(0.5, rad * 0.012), mix(dcol, P.grid, 0.3), r);
    }
  }
  // packets on a few of those streets
  const pn = traffic === 'Overload' ? 5 : traffic === 'Rush' ? 3 : 1;
  for (let i = 1; i < nodes.length; i += 2) {
    const j = Math.floor(r() * i);
    packets(x, P, nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1], pn, P.hot, rad * 0.05, r);
  }
  // the nodes on top
  for (const [nx, ny] of nodes) {
    const lit = r() < 0.5;
    node(x, P, nx, ny, rad * (0.05 + r() * 0.06), lit ? dcol : mix(dcol, P.grid, 0.4), lit);
  }
  return nodes;
}

/* ── Atmosphere: dark ground, faint circuit substrate, haze, hex-rain, scan ──*/

function paintGround(x, P, W, H, S, haze, r) {
  // deep dark vertical-ish ground with a faint glow seat
  const bg = x.createLinearGradient(0, 0, W * 0.2, H);
  bg.addColorStop(0, mix(P.ground, P.haze, 0.10));
  bg.addColorStop(0.5, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000002', 0.55));
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // faint circuit substrate: a sparse lattice of grid lines (the board)
  x.save();
  x.globalAlpha = 0.5;
  x.strokeStyle = rgba(P.grid, 0.6);
  x.lineWidth = 1;
  const step = S * 0.055;
  for (let gx = step; gx < W; gx += step) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = step; gy < H; gy += step) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  x.restore();

  // a few large light-pollution haze blooms low in the stack for depth
  x.save();
  x.globalCompositeOperation = 'lighter';
  const blooms = haze === 'Smog' ? 5 : 3;
  for (let i = 0; i < blooms; i++) {
    const fx = W * (0.15 + r() * 0.7), fy = H * (0.15 + r() * 0.7);
    const fr = S * (0.35 + r() * 0.5);
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
    g.addColorStop(0, rgba(P.haze, haze === 'Smog' ? 0.16 : 0.10));
    g.addColorStop(1, rgba(P.haze, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.restore();
}

/* Hex / datastream rain washed faintly over the frame — terminal texture. */
function hexRain(x, P, W, H, S, r) {
  const HEX = '0123456789ABCDEF';
  x.save();
  x.globalCompositeOperation = 'lighter';
  const fs = Math.max(7, S * 0.012);
  x.font = fs + 'px Menlo, Consolas, monospace';
  x.textBaseline = 'top';
  const cols = Math.floor(W / (fs * 0.9));
  for (let c = 0; c < cols; c++) {
    if (r() < 0.55) continue; // sparse columns
    const cx = c * fs * 0.9 + fs * 0.2;
    const len = rint(r, 3, 14);
    const top = r() * H;
    for (let i = 0; i < len; i++) {
      const ch = HEX[Math.floor(r() * 16)];
      const a = (1 - i / len) * (0.05 + r() * 0.10);
      x.fillStyle = rgba(i === 0 ? mix(P.neon, '#ffffff', 0.5) : P.neon, a);
      x.fillText(ch, cx, top + i * fs * 1.05);
    }
  }
  x.restore();
}

/* CRT scanlines + a subtle phosphor bloom pass over everything. */
function crtFinish(x, P, W, H, S, r) {
  // horizontal scanlines
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1.4);
  x.restore();
  // soft bloom wash — pull the brights up
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(W / 2, H * 0.46, S * 0.1, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, rgba(P.haze, 0.06));
  g.addColorStop(1, rgba(P.haze, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.restore();
}

/* Density → district/node counts. */
function densityMul(d) { return d === 'Sparse' ? 0.6 : d === 'Packed' ? 1.0 : 1.55; }

/* ════════════════════════════════════════════════════════════════════════════
 * THE SIX LAYOUTS
 * ══════════════════════════════════════════════════════════════════════════ */

/* 1. RADIAL CORE — blazing downtown core, ring-roads + radial spokes, halo of
 *    districts fanning out. A capital seen from orbit. */
function layoutRadial(x, P, W, H, S, dm, traffic, r) {
  const cx = W * (0.5 + randn(r) * 0.05);
  const cy = H * (0.5 + randn(r) * 0.05);
  const maxR = Math.hypot(W, H) * 0.52;

  // ring-roads (orbital buses)
  const rings = rint(r, 3, 5);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= rings; i++) {
    const rad = maxR * (i / rings) * (0.85 + r() * 0.2);
    x.strokeStyle = rgba(i === 1 ? P.hot : P.neon, 0.10);
    x.lineWidth = S * 0.02;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = rgba(P.neon, 0.55);
    x.lineWidth = Math.max(0.8, S * 0.004);
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
  }
  x.restore();

  // radial spokes (trunk buses out of downtown)
  const spokes = rint(r, 8, 14);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + randn(r) * 0.05;
    const ex = cx + Math.cos(a) * maxR, ey = cy + Math.sin(a) * maxR;
    bus(x, P, cx, cy, ex, ey, Math.max(1, S * 0.0045), P.neon, true);
    packets(x, P, cx, cy, ex, ey, traffic === 'Overload' ? 14 : traffic === 'Rush' ? 8 : 4, P.hot, S * 0.012, r);
  }

  // downtown core: big substation + dense node cluster
  substation(x, P, cx, cy, maxR * 0.32, P.hot);
  district(x, P, cx, cy, S * 0.13 * (0.8 + dm * 0.4), Math.floor(40 * dm), traffic, r);

  // halo of districts seated on the rings
  const ndist = Math.floor(rint(r, 9, 16) * dm);
  for (let i = 0; i < ndist; i++) {
    const a = r() * Math.PI * 2;
    const rad = maxR * (0.4 + r() * 0.6);
    const dx = cx + Math.cos(a) * rad, dy = cy + Math.sin(a) * rad;
    district(x, P, dx, dy, S * (0.04 + r() * 0.05), Math.floor((10 + r() * 18) * dm), traffic, r);
  }
}

/* 2. GRID SPRAWL — endless circuit lattice, packed blocks to every edge, bus
 *    avenues. No hero — pure mass and density. */
function layoutGrid(x, P, W, H, S, dm, traffic, r) {
  const cols = Math.round((6 + r() * 4) * Math.sqrt(dm));
  const rows = Math.round(cols * H / W);
  const cw = W / cols, ch = H / rows;

  // bus avenues — a few heavy through-lines, H and V
  x.save();
  for (let i = 0; i < cols; i++) {
    if (r() < 0.7) continue;
    const ax = (i + 0.5) * cw;
    bus(x, P, ax, 0, ax, H, Math.max(1, S * 0.004), P.neon, true);
    packets(x, P, ax, 0, ax, H, traffic === 'Overload' ? 22 : traffic === 'Rush' ? 12 : 6, P.hot, S * 0.01, r);
  }
  for (let j = 0; j < rows; j++) {
    if (r() < 0.7) continue;
    const ay = (j + 0.5) * ch;
    bus(x, P, 0, ay, W, ay, Math.max(1, S * 0.004), P.deep, true);
    packets(x, P, 0, ay, W, ay, traffic === 'Overload' ? 22 : traffic === 'Rush' ? 12 : 6, P.hot, S * 0.01, r);
  }
  x.restore();

  // a packed block in (almost) every cell — atmospheric depth via per-block alpha
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (r() < 0.12) continue; // a few vacant lots
      const bx = (i + 0.5) * cw, by = (j + 0.5) * ch;
      const depth = 0.55 + r() * 0.45; // fakes scale variation
      x.save();
      x.globalAlpha = depth;
      district(x, P, bx, by, Math.min(cw, ch) * 0.42 * depth, Math.floor((6 + r() * 12) * dm), traffic, r);
      x.restore();
    }
  }
}

/* 3. RIVER DELTA — fat trunk buses branch like a delta of light; districts
 *    cluster on the banks. Flow as form. */
function layoutDelta(x, P, W, H, S, dm, traffic, r) {
  const fromTop = r() < 0.5;
  const mouthX = W * (0.2 + r() * 0.6);
  const branches = [];

  // recursive-ish branching trunk, drawn iteratively
  function flow(x0, y0, ang, len, w, depth) {
    if (depth > 4 || len < S * 0.06) return;
    const segs = 4;
    let px = x0, py = y0, a = ang;
    for (let s = 0; s < segs; s++) {
      a += randn(r) * 0.25;
      const nx = px + Math.cos(a) * (len / segs);
      const ny = py + Math.sin(a) * (len / segs);
      bus(x, P, px, py, nx, ny, w, depth === 0 ? P.hot : P.neon, true);
      packets(x, P, px, py, nx, ny, traffic === 'Overload' ? 8 : traffic === 'Rush' ? 5 : 2, mix(P.hot, '#ffffff', 0.3), w * 1.2, r);
      // district on the bank
      if (r() < 0.7) {
        district(x, P, nx + randn(r) * len * 0.1, ny + randn(r) * len * 0.1,
                 S * (0.03 + r() * 0.05) * (1 - depth * 0.12), Math.floor((8 + r() * 14) * dm), traffic, r);
      }
      px = nx; py = ny;
    }
    // split into 2–3 children
    const kids = rint(r, 2, 3);
    for (let k = 0; k < kids; k++) {
      flow(px, py, a + (k - (kids - 1) / 2) * (0.5 + r() * 0.4), len * (0.62 + r() * 0.18), w * 0.66, depth + 1);
    }
  }

  const startA = fromTop ? Math.PI / 2 : -Math.PI / 2;
  const sx = mouthX, sy = fromTop ? -H * 0.02 : H * 1.02;
  substation(x, P, sx, clamp(sy, 0, H), S * 0.25, P.hot);
  flow(sx, sy, startA + randn(r) * 0.2, Math.hypot(W, H) * 0.3, Math.max(2, S * 0.012) * (0.8 + dm * 0.4), 0);
}

/* 4. CONSTELLATION — discrete districts on phi/thirds points, long trunk-lines
 *    wiring them. Sparse, deep, most dark between. */
function layoutConstellation(x, P, W, H, S, dm, traffic, r) {
  const xs = [INVPHI, 1 - INVPHI, 1 / 3, 2 / 3, 0.5];
  const ys = [INVPHI, 1 - INVPHI, 1 / 3, 2 / 3, 0.5];
  const pts = [];
  for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
  const n = Math.max(4, Math.floor(rint(r, 5, 9) * dm * 0.8));
  const hubs = [];
  for (let i = 0; i < n && i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const hx = W * clamp(ax + randn(r) * 0.05, 0.1, 0.9);
    const hy = H * clamp(ay + randn(r) * 0.05, 0.1, 0.9);
    hubs.push([hx, hy, S * (0.05 + r() * 0.06)]);
  }
  // long inter-district trunk-lines (nearest-ish neighbour wiring)
  for (let i = 0; i < hubs.length; i++) {
    const links = rint(r, 1, 2);
    for (let l = 0; l < links; l++) {
      const j = (i + 1 + Math.floor(r() * (hubs.length - 1))) % hubs.length;
      if (j === i) continue;
      bus(x, P, hubs[i][0], hubs[i][1], hubs[j][0], hubs[j][1], Math.max(1, S * 0.0035), P.deep, true);
      packets(x, P, hubs[i][0], hubs[i][1], hubs[j][0], hubs[j][1],
              traffic === 'Overload' ? 12 : traffic === 'Rush' ? 7 : 3, P.hot, S * 0.011, r);
    }
  }
  // the districts themselves
  for (const [hx, hy, rad] of hubs) {
    substation(x, P, hx, hy, rad * 2.2, P.neon);
    district(x, P, hx, hy, rad, Math.floor((16 + r() * 24) * dm), traffic, r);
  }
}

/* 5. ISO SKYLINE — faint isometric tilt; packed iso block-towers cast shallow
 *    3-D, buses thread the canyons, depth stacked front-to-back. */
function layoutIso(x, P, W, H, S, dm, traffic, r) {
  const cols = Math.round((9 + r() * 5) * Math.sqrt(dm));
  const rows = Math.round(cols * 1.1);
  const cw = W / cols;
  const ch = H / rows * 1.4; // overlap rows so towers stack
  const isoLift = S * 0.05; // how much "height" reads as vertical offset

  // draw back-to-front (top rows first) so nearer towers occlude
  for (let j = 0; j < rows; j++) {
    const depth = j / rows; // 0 = back/top, 1 = front/bottom
    for (let i = 0; i < cols; i++) {
      if (r() < 0.15) continue;
      const bx = i * cw + cw * 0.5 + (depth - 0.5) * cw * 0.3;
      const by = j * (H / rows) + (H / rows) * 0.5;
      const ht = (0.4 + r() * 0.6) * isoLift * (0.6 + depth * 0.9);
      const bw = cw * (0.42 + r() * 0.16);
      const dcol = pick([P.neon, P.deep, P.hot], r);
      const a = 0.35 + depth * 0.65; // atmospheric perspective: back fades
      // tower body (top face + a faint side face for the iso read)
      x.save();
      x.globalAlpha = a;
      // side / extruded face
      x.fillStyle = rgba(mix(P.ground, '#000', 0.4), 0.85);
      x.fillRect(bx - bw / 2, by - ht, bw, ht + bw * 0.5);
      // glowing top edge (the lit roof)
      x.strokeStyle = rgba(dcol, 0.9);
      x.lineWidth = Math.max(0.6, bw * 0.08);
      x.strokeRect(bx - bw / 2, by - ht, bw, bw * 0.5);
      // window/circuit dots on the face
      if (r() < 0.7) {
        x.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) {
          if (r() < 0.5) continue;
          x.fillStyle = rgba(mix(dcol, '#ffffff', 0.3), 0.7);
          x.fillRect(bx - bw / 2 + r() * bw, by - ht + r() * (ht + bw * 0.3), bw * 0.12, bw * 0.12);
        }
      }
      x.restore();
      // a roof bloom on the taller / lit towers
      if (ht > isoLift * 0.7 && r() < 0.5) substation(x, P, bx, by - ht, bw * 1.2, dcol);
    }
    // a bus threading this canyon row
    if (r() < 0.55) {
      const ay = j * (H / rows) + (H / rows) * 0.5 + (H / rows) * 0.4;
      bus(x, P, 0, ay, W, ay, Math.max(0.8, S * 0.003) * (0.5 + depth), P.neon, true);
      packets(x, P, 0, ay, W, ay, traffic === 'Overload' ? 16 : traffic === 'Rush' ? 9 : 4, P.hot, S * 0.009, r);
    }
  }
}

/* 6. RING WORLD — concentric ring-districts (circular mainframe); orbital buses
 *    sweep the arcs, spokes cross them. */
function layoutRing(x, P, W, H, S, dm, traffic, r) {
  const cx = W * (0.5 + randn(r) * 0.04);
  const cy = H * (0.5 + randn(r) * 0.04);
  const maxR = Math.min(W, H) * 0.48;
  const rings = Math.max(3, Math.floor(rint(r, 4, 7) * 0.8));

  substation(x, P, cx, cy, maxR * 0.3, P.hot);

  for (let ri = 1; ri <= rings; ri++) {
    const rad = maxR * (ri / rings);
    const col = ri % 2 === 0 ? P.deep : P.neon;
    // the orbital bus arc
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(col, 0.12);
    x.lineWidth = S * 0.025;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = rgba(col, 0.6);
    x.lineWidth = Math.max(0.8, S * 0.004);
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    x.restore();

    // packets sweeping the arc
    const segN = traffic === 'Overload' ? 60 : traffic === 'Rush' ? 36 : 20;
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let s = 0; s < segN; s++) {
      const a = r() * Math.PI * 2;
      const ln = 0.04 + r() * 0.05;
      x.strokeStyle = rgba(mix(P.hot, '#ffffff', r() * 0.4), 0.5 + r() * 0.4);
      x.lineWidth = Math.max(0.8, S * 0.004);
      x.beginPath(); x.arc(cx, cy, rad, a, a + ln); x.stroke();
    }
    x.restore();

    // districts seated around this ring
    const dn = Math.floor((ri + 3) * dm);
    for (let d = 0; d < dn; d++) {
      const a = (d / dn) * Math.PI * 2 + randn(r) * 0.1;
      const dx = cx + Math.cos(a) * rad, dy = cy + Math.sin(a) * rad;
      district(x, P, dx, dy, S * (0.025 + r() * 0.03) * (0.6 + ri / rings), Math.floor((6 + r() * 10) * dm), traffic, r);
    }
  }

  // crossing spokes
  const spokes = rint(r, 6, 12);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    bus(x, P, cx, cy, cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR, Math.max(0.8, S * 0.003), P.deep, true);
  }
}

/* ── Master draw ─────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);
  const dm = densityMul(p.density);
  resetBudget();

  paintGround(x, P, W, H, S, p.haze, r);

  switch (p.layout) {
    case 'Radial Core':   layoutRadial(x, P, W, H, S, dm, p.traffic, r); break;
    case 'Grid Sprawl':   layoutGrid(x, P, W, H, S, dm, p.traffic, r); break;
    case 'River Delta':   layoutDelta(x, P, W, H, S, dm, p.traffic, r); break;
    case 'Constellation': layoutConstellation(x, P, W, H, S, dm, p.traffic, r); break;
    case 'Iso Skyline':   layoutIso(x, P, W, H, S, dm, p.traffic, r); break;
    case 'Ring World':    layoutRing(x, P, W, H, S, dm, p.traffic, r); break;
  }

  // datastream / hex rain over the whole frame (terminal texture)
  hexRain(x, P, W, H, S, r);

  // atmospheric smog wash for deeper haze seeds — re-seats depth on top
  if (p.haze === 'Smog') {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(W * 0.5, H * 0.55, S * 0.2, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, rgba(P.haze, 0));
    g.addColorStop(1, rgba(P.haze, 0.14));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.restore();
  }

  // phosphor mottle + CRT finish
  mottle(x, 0, 0, W, H, P.neon, 900, r, 'screen');
  crtFinish(x, P, W, H, S, r);
  grain(x, W, H, 700, r);
  vignette(x, W, H, p.haze === 'Smog' ? 0.34 : 0.42);
}

/* ── Exports ─────────────────────────────────────────────────────────────── */
export const haloCTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const haloCSchema: TraitSchema = {
  traits: [
    { name: 'Layout', values: LAYOUTS,
      subtraits: [
        { name: 'Centred', values: ['Radial Core', 'Ring World', 'Iso Skyline'] },
        { name: 'Spread', values: ['Grid Sprawl', 'River Delta', 'Constellation'] },
      ] },
    { name: 'Palette', values: PALS.map((p) => p.name),
      subtraits: [
        { name: 'Hot', values: ['Magenta Mainframe', 'Sodium Override', 'Blood Protocol', 'Ember Grid', 'Plasma Core'] },
        { name: 'Cold', values: ['Acid Terminal', 'Ion Drift', 'Toxic Subnet', 'Arctic Daemon'] },
        { name: 'Full Bus', values: ['Spectrum Bus'] },
      ] },
    { name: 'Format', values: ['Square', 'Tall', 'Wide'],
      subtraits: [
        { name: 'Upright', values: ['Square', 'Tall'] },
        { name: 'Broad', values: ['Wide'] },
      ] },
    { name: 'Density', values: DENSITY,
      subtraits: [
        { name: 'Open', values: ['Sparse'] },
        { name: 'Built Up', values: ['Packed', 'Megacity'] },
      ] },
    { name: 'Traffic', values: TRAFFIC },
    { name: 'Haze',    values: HAZE },
  ],
};

export const renderHaloC: EngineFn = blit(draw, haloCTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
export const HALOC_ASPECTS = [1, 0.788, 1.269] as const;
