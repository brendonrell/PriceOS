/* K3 — STRATA
 * An epic vertical cross-section of a cyberpunk machine-world: a geological
 * core sample / deep-sea sounding cut straight down through a digital planet.
 * Stacked horizontal strata — glowing data-sediment, circuit-bedrock,
 * fiber-optic veins, fossilized code, molten reactor cores deep down — each
 * band a different texture + saturated colour, separated by hazy mottled
 * boundaries. Overlaid with terminal instrumentation: a depth gauge ticking
 * down the side, seismograph/waveform readouts, stratum annotations, and a
 * scan/drill column boring through the section. An instrument reading the deep
 * structure of a world: epic vertical scale, dense, textured, high variety.
 *
 * Rare chase events: a CORE BREACH (molten reactor splits the rock) and a
 * FAULT SLIP (a tectonic glitch shears the whole stack sideways). */
window.ENGINE = (function () {
  const K = window.KIT;

  // 8 SATURATED cyberpunk-terminal colorways. Roles:
  // bg   = void above the section / deepest dark
  // rock = base sediment body tone (the band fill)
  // glow = primary luminous data colour
  // vein = secondary luminous accent (fibre / circuit)
  // hot  = molten/reactor accent (deep cores, breaches)
  // hud  = instrumentation / readout ink
  // ink  = terminal annotation text
  const PALS = [
    { name: 'Reactor Deep',  bg: '#03070a', rock: '#0c2a26', glow: '#2dffb0', vein: '#5be0ff', hot: '#ff7a18', hud: '#5bffb0', ink: '#bafff0' },
    { name: 'Magma Core',    bg: '#0a0303', rock: '#2a0f12', glow: '#ff9a2d', vein: '#ffd23d', hot: '#ff2e4d', hud: '#ffb04a', ink: '#ffe4c0' },
    { name: 'Cryo Vein',     bg: '#020512', rock: '#0c1c3a', glow: '#36c6ff', vein: '#7affd6', hot: '#ff48c0', hud: '#7ad6ff', ink: '#d6eeff' },
    { name: 'Toxic Strata',  bg: '#040a02', rock: '#16300a', glow: '#b6ff1f', vein: '#3dffd2', hot: '#ff2e8a', hud: '#caff4a', ink: '#eaffc0' },
    { name: 'Ultraviolet',   bg: '#06031a', rock: '#1f0f4a', glow: '#a86bff', vein: '#ff4fc0', hot: '#3df0ff', hud: '#bf8aff', ink: '#ecdcff' },
    { name: 'Plasma Bloom',  bg: '#0a0210', rock: '#2c0a30', glow: '#ff2da0', vein: '#ff9a3d', hot: '#36e0ff', hud: '#ff7ad0', ink: '#ffd6ef' },
    { name: 'Halon Gold',    bg: '#0a0702', rock: '#2e2006', glow: '#ffc21f', vein: '#34e0d0', hot: '#ff4d2e', hud: '#ffd24a', ink: '#fff0c8' },
    { name: 'Abyss Signal',  bg: '#02060c', rock: '#06222c', glow: '#1fd6c0', vein: '#3d9aff', hot: '#ff5db0', hud: '#5be0d0', ink: '#cffff4' },
  ];

  // Vary aspect — lean tall to SELL vertical depth, with a couple of others.
  const FMTS = [
    { W: 1000, H: 1500, t: 'Core' },     // tall portrait — the signature
    { W: 1040, H: 1480, t: 'Sounding' }, // tall portrait variant
    { W: 1100, H: 1440, t: 'Column' },   // tall portrait variant
    { W: 1280, H: 1180, t: 'Section' },  // near-square cross-section
    { W: 1280, H: 980,  t: 'Strdata' },  // landscape banded read
  ];

  // Each stratum draws with one of these textural treatments.
  const STRATA_KINDS = [
    'sediment',  // mottled grain bands of glowing data-dust
    'circuit',   // bedrock with circuit traces / vias
    'fiber',     // bundled fiber-optic veins running horizontal
    'code',      // fossilized code — rows of glyphs
    'crystal',   // crystalline lattice / fractured shards
    'magma',     // molten flow with bright fracture cracks
    'wave',      // seismic waveform laminations
    'void',      // dark gap / cavity with sparse motes
  ];

  const DEPTHS = ['Shallow', 'Mantle', 'Deep', 'Abyssal'];
  const INSTR = ['Sounding', 'Seismic', 'Core Log', 'Spectro'];
  const SCAN = ['None', 'None', 'Drill Line', 'Scan Column'];
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'Core Breach', 'Fault Slip'];

  const GLY = '0123456789ABCDEF░▒▓│┤╣║╗╝╚╔╩╦╠═╬⌐¬◊◆▮▯+×=<>/\\{}[]:;.ｱｲｳｴｵｶｷｸﾊﾋﾌﾍﾎ';
  const CODEGLY = '0123456789ABCDEFx<>=/\\{}[]()+*-:;.,#$%&|!?abcdef';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const depth = K.pick(DEPTHS, r);
    const instr = K.pick(INSTR, r);
    const scan = K.pick(SCAN, r);
    const event = K.pick(EVENTS, r);
    // number of strata bands — variety driver
    const count = K.rint(r, 7, 13);
    return { pal, fmt, depth, instr, scan, event, count };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Depth: p.depth,
      Instrument: p.instr,
      Strata: p.count,
      Scan: p.scan === 'None' ? 'Off' : p.scan,
      Event: p.event,
    };
  }

  // ── shared helpers ─────────────────────────────────────────────────────
  function bandBase(x, P, x0, y0, w, h, top, bot) {
    // vertical gradient inside the band gives every stratum internal depth
    const g = x.createLinearGradient(x0, y0, x0, y0 + h);
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    x.fillStyle = g; x.fillRect(x0, y0, w, h);
  }

  // ── stratum painters ───────────────────────────────────────────────────
  function sediment(x, P, x0, y0, w, h, depth, noise, r, lit) {
    bandBase(x, P, x0, y0, w, h,
      K.mix(P.rock, P.bg, 0.18 - depth * 0.08),
      K.mix(P.rock, lit, 0.24 + depth * 0.14));
    // dense fine horizontal laminations — the signature sediment grain
    x.save();
    const lines = Math.floor(h / (1.6 + r() * 1.8));
    for (let i = 0; i < lines; i++) {
      const yy = y0 + (i + r() * 0.4) / lines * h;
      const dark = r() < 0.5;
      x.strokeStyle = K.rgba(dark ? K.mix(P.rock, '#000', 0.55) : K.mix(lit, '#fff', 0.14), 0.06 + r() * 0.18);
      x.lineWidth = 0.5 + r() * 1.3;
      x.beginPath();
      let px = x0;
      x.moveTo(px, yy);
      while (px < x0 + w) { px += 10 + r() * 22; x.lineTo(px, yy + (noise.noise2(px / 55, yy / 38) * (1 + depth * 3))); }
      x.stroke();
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, lit, 60 - depth * 18, r, 'screen');
    K.mottle(x, x0, y0, w, h, K.mix(lit, P.vein, 0.4), 110, r, 'overlay');
    // glowing data-dust motes — denser
    x.save(); x.globalCompositeOperation = 'lighter';
    const motes = Math.floor(w * h / (260 - depth * 120));
    for (let i = 0; i < motes; i++) {
      const mx = x0 + r() * w, my = y0 + r() * h;
      x.fillStyle = K.rgba(r() < 0.25 ? P.vein : lit, (0.12 + r() * 0.45) * (0.45 + depth * 0.55));
      const s = 0.6 + r() * 1.7;
      x.fillRect(mx, my, s, s);
    }
    x.restore();
  }

  function circuit(x, P, x0, y0, w, h, depth, noise, r, lit) {
    bandBase(x, P, x0, y0, w, h,
      K.mix(P.rock, '#000', 0.25),
      K.mix(P.rock, P.bg, 0.1));
    x.save(); x.globalCompositeOperation = 'lighter';
    // PCB traces — orthogonal runs with vias
    const traces = Math.floor(w / (26 + r() * 30)) + 4;
    for (let i = 0; i < traces; i++) {
      let cx = x0 + r() * w, cy = y0 + r() * h;
      const col = r() < 0.4 ? P.vein : lit;
      x.strokeStyle = K.rgba(col, 0.18 + r() * 0.4);
      x.lineWidth = 0.7 + r() * 1.4;
      x.beginPath(); x.moveTo(cx, cy);
      const steps = K.rint(r, 2, 6);
      for (let s = 0; s < steps; s++) {
        if (r() < 0.5) cx += (r() - 0.5) * w * 0.4; else cy += (r() - 0.5) * h * 0.7;
        cx = K.clamp(cx, x0, x0 + w); cy = K.clamp(cy, y0, y0 + h);
        x.lineTo(cx, cy);
      }
      x.stroke();
      // via pad at the end
      if (r() < 0.7) { x.fillStyle = K.rgba(col, 0.5 + r() * 0.4); x.beginPath(); x.arc(cx, cy, 1.2 + r() * 2, 0, 6.283); x.fill(); }
    }
    // chip blocks
    const chips = K.rint(r, 2, 6);
    for (let i = 0; i < chips; i++) {
      const cw = w * (0.04 + r() * 0.1), ch = Math.min(h * 0.7, cw * (0.5 + r()));
      const px = x0 + r() * (w - cw), py = y0 + r() * (h - ch);
      x.strokeStyle = K.rgba(lit, 0.4 + r() * 0.4); x.lineWidth = 1; x.strokeRect(px, py, cw, ch);
      x.fillStyle = K.rgba(P.rock, 0.3); x.fillRect(px, py, cw, ch);
      // pins
      x.fillStyle = K.rgba(P.vein, 0.5);
      for (let pn = px + 2; pn < px + cw - 2; pn += 3) { x.fillRect(pn, py - 1.5, 1, 1.5); x.fillRect(pn, py + ch, 1, 1.5); }
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, lit, 140, r, 'overlay');
  }

  function fiber(x, P, x0, y0, w, h, depth, noise, r, lit) {
    bandBase(x, P, x0, y0, w, h, K.mix(P.bg, P.rock, 0.6), K.mix(P.bg, '#000', 0.15));
    x.save(); x.globalCompositeOperation = 'lighter';
    // bundled fibre-optic veins running roughly horizontal, with glow cores
    const fibers = Math.floor(h / (2.4 + r() * 2.6)) + 10;
    for (let i = 0; i < fibers; i++) {
      const baseY = y0 + (i / fibers) * h + (r() - 0.5) * 4;
      const col = r() < 0.45 ? P.vein : lit;
      const amp = (1 + r() * 4) * (1 + depth);
      x.lineWidth = 0.6 + r() * 1.8;
      x.strokeStyle = K.rgba(col, 0.18 + r() * 0.4);
      x.beginPath();
      for (let px = x0; px <= x0 + w; px += 6) {
        const yy = baseY + Math.sin(px / (40 + r() * 30) + i) * amp + noise.noise2(px / 90, baseY / 50) * amp;
        px === x0 ? x.moveTo(px, yy) : x.lineTo(px, yy);
      }
      x.stroke();
      // bright pulse nodes along a few fibres
      if (r() < 0.3) {
        const nx = x0 + r() * w;
        const ny = baseY + Math.sin(nx / (40 + r() * 30) + i) * amp;
        K.bloom(x, nx, ny, 6 + r() * 14, col, 0.5);
      }
    }
    x.restore();
  }

  function code(x, P, x0, y0, w, h, depth, noise, r, lit) {
    bandBase(x, P, x0, y0, w, h, K.mix(P.rock, '#000', 0.4), K.mix(P.rock, P.bg, 0.2));
    x.save();
    const fs = K.clamp(h / (3 + K.rint(r, 1, 4)), 7, 16);
    x.font = `${fs}px monospace`; x.textBaseline = 'top';
    for (let yy = y0 + 2; yy < y0 + h - fs; yy += fs * 1.12) {
      let px = x0 + 2;
      while (px < x0 + w - fs) {
        const lit2 = r() < 0.12;
        const a = lit2 ? 0.6 + r() * 0.4 : 0.12 + r() * 0.3;
        x.save(); if (lit2) x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(lit2 ? (r() < 0.4 ? P.vein : lit) : K.mix(lit, P.rock, 0.4), a);
        x.fillText(CODEGLY[Math.floor(r() * CODEGLY.length)], px, yy);
        x.restore();
        px += fs * (0.62 + r() * 0.18);
      }
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, lit, 160, r, 'overlay');
  }

  function crystal(x, P, x0, y0, w, h, depth, noise, r, lit) {
    bandBase(x, P, x0, y0, w, h, K.mix(P.rock, P.vein, 0.1), K.mix(P.rock, '#000', 0.3));
    x.save(); x.globalCompositeOperation = 'lighter';
    // crystalline shards — angular facets
    const shards = K.rint(r, 14, 30);
    for (let i = 0; i < shards; i++) {
      const cx = x0 + r() * w, cy = y0 + r() * h;
      const sz = (6 + r() * 26) * (0.5 + depth);
      const pts = K.rint(r, 3, 5);
      const col = r() < 0.4 ? P.vein : lit;
      x.beginPath();
      for (let pn = 0; pn <= pts; pn++) {
        const a = (pn / pts) * 6.283 + r() * 0.6;
        const rr = sz * (0.4 + r() * 0.8);
        const xx = cx + Math.cos(a) * rr, yy = cy + Math.sin(a) * rr * 0.6;
        pn === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
      }
      x.closePath();
      x.strokeStyle = K.rgba(col, 0.2 + r() * 0.4); x.lineWidth = 0.6 + r();
      x.stroke();
      if (r() < 0.4) { x.fillStyle = K.rgba(col, 0.05 + r() * 0.12); x.fill(); }
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, lit, 120, r, 'screen');
  }

  function magma(x, P, x0, y0, w, h, depth, noise, r, lit) {
    // molten flow — hot gradient + bright fracture cracks
    bandBase(x, P, x0, y0, w, h, K.mix(P.rock, P.hot, 0.25), K.mix(P.hot, '#000', 0.35));
    // glowing molten haze via fbm sampled to the band
    x.save(); x.globalCompositeOperation = 'screen';
    const step = Math.max(3, Math.floor(w / 160));
    for (let yy = y0; yy < y0 + h; yy += step) {
      for (let xx = x0; xx < x0 + w; xx += step) {
        const n = (noise.fbm(xx / 70, yy / 40, 4, 0.6, 2.2) + 1) / 2;
        const a = K.clamp(n * n * (0.5 + depth * 0.5), 0, 0.9);
        if (a < 0.04) continue;
        x.fillStyle = K.rgba(K.mix(P.hot, lit, n * 0.5), a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
    // fracture cracks — bright branching lines
    x.save(); x.globalCompositeOperation = 'lighter';
    const cracks = K.rint(r, 4, 10);
    for (let i = 0; i < cracks; i++) {
      let cx = x0 + r() * w, cy = y0 + r() * h;
      x.strokeStyle = K.rgba(r() < 0.5 ? '#fff' : K.mix(P.hot, '#fff', 0.5), 0.3 + r() * 0.5);
      x.lineWidth = 0.6 + r() * 1.6;
      x.beginPath(); x.moveTo(cx, cy);
      const segs = K.rint(r, 4, 9);
      for (let s = 0; s < segs; s++) {
        cx += (r() - 0.5) * w * 0.18; cy += (r() - 0.4) * h * 0.4;
        cx = K.clamp(cx, x0, x0 + w); cy = K.clamp(cy, y0, y0 + h);
        x.lineTo(cx, cy);
      }
      x.stroke();
    }
    x.restore();
    K.bloom(x, x0 + w * (0.3 + r() * 0.4), y0 + h * 0.5, Math.max(w, h) * 0.4, P.hot, 0.18);
  }

  function wave(x, P, x0, y0, w, h, depth, noise, r, lit) {
    bandBase(x, P, x0, y0, w, h, K.mix(P.bg, P.rock, 0.7), K.mix(P.bg, '#000', 0.25));
    x.save(); x.globalCompositeOperation = 'lighter';
    // stacked seismic waveform laminations — denser
    const rows = K.rint(r, 8, 16);
    for (let rw = 0; rw < rows; rw++) {
      const my = y0 + (rw + 0.5) / rows * h;
      const amp = (h / rows) * (0.25 + r() * 0.35);
      const col = r() < 0.3 ? P.vein : lit;
      x.strokeStyle = K.rgba(col, 0.25 + r() * 0.4); x.lineWidth = 0.8 + r() * 1.2;
      x.beginPath();
      const f1 = 3 + r() * 8, f2 = 9 + r() * 18, ph = r() * 6.283;
      for (let px = x0; px <= x0 + w; px += 4) {
        const t = (px - x0) / w;
        const env = Math.sin(t * Math.PI * (1 + r() * 0)) ; // not per-px random
        const yy = my + (Math.sin(t * f1 * 6.283 + ph) * 0.5 + Math.sin(t * f2 * 6.283) * 0.5) * amp * (0.4 + Math.abs(noise.noise2(t * 6, rw)));
        px === x0 ? x.moveTo(px, yy) : x.lineTo(px, yy);
      }
      x.stroke();
      void rows; // keep
    }
    x.restore();
    K.mottle(x, x0, y0, w, h, lit, 150, r, 'screen');
  }

  function voidband(x, P, x0, y0, w, h, depth, noise, r, lit) {
    // a dark cavity — near-black with sparse glowing motes + a faint floor glow
    bandBase(x, P, x0, y0, w, h, K.mix(P.bg, '#000', 0.4), K.mix(P.bg, P.rock, 0.2));
    x.save(); x.globalCompositeOperation = 'lighter';
    const motes = Math.floor(w * h / 2200);
    for (let i = 0; i < motes; i++) {
      const mx = x0 + r() * w, my = y0 + r() * h;
      x.fillStyle = K.rgba(r() < 0.3 ? P.vein : lit, 0.2 + r() * 0.5);
      const s = 0.6 + r() * 1.4; x.fillRect(mx, my, s, s);
      if (r() < 0.08) K.bloom(x, mx, my, 4 + r() * 10, lit, 0.4);
    }
    // faint floor glow
    const fg = x.createLinearGradient(x0, y0 + h, x0, y0 + h * 0.5);
    fg.addColorStop(0, K.rgba(lit, 0.12)); fg.addColorStop(1, K.rgba(lit, 0));
    x.fillStyle = fg; x.fillRect(x0, y0 + h * 0.5, w, h * 0.5);
    x.restore();
  }

  const PAINTERS = { sediment, circuit, fiber, code, crystal, magma, wave, void: voidband };

  // boundary between strata — a hazy mottled seam with a thin lit edge
  function boundary(x, P, x0, y, w, col, r) {
    // dark compression shadow just under the seam — sells stacked layers
    x.save(); x.globalCompositeOperation = 'multiply';
    const sh = 4 + r() * 8;
    const sg = x.createLinearGradient(x0, y, x0, y + sh);
    sg.addColorStop(0, 'rgba(0,0,0,0.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sg; x.fillRect(x0, y, w, sh);
    x.restore();
    // hazy interlayer glow
    x.save();
    x.globalCompositeOperation = 'screen';
    const gh = 12 + r() * 26;
    const g = x.createLinearGradient(x0, y - gh, x0, y + gh);
    g.addColorStop(0, K.rgba(col, 0));
    g.addColorStop(0.5, K.rgba(col, 0.16 + r() * 0.16));
    g.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = g; x.fillRect(x0, y - gh, w, gh * 2);
    x.restore();
    // thin bright lit seam, slightly irregular
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.35 + r() * 0.45); x.lineWidth = 0.8 + r() * 1;
    x.beginPath();
    let px = x0; x.moveTo(px, y);
    while (px < x0 + w) { px += 12 + r() * 24; x.lineTo(px, y + (r() - 0.5) * 6); }
    x.stroke();
    x.restore();
  }

  // ── terminal instrumentation ────────────────────────────────────────────
  function depthGauge(x, P, gx, top, bot, count, bands, instr, r) {
    // a vertical rail with depth ticks + numeric readouts down the left margin
    x.save();
    x.strokeStyle = K.rgba(P.hud, 0.5); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(gx, top); x.lineTo(gx, bot); x.stroke();
    const fs = Math.max(8, (bot - top) * 0.013);
    x.font = `${fs}px monospace`; x.textBaseline = 'middle';
    const major = count;
    for (let i = 0; i <= major * 4; i++) {
      const t = i / (major * 4);
      const yy = top + t * (bot - top);
      const isMaj = i % 4 === 0;
      x.strokeStyle = K.rgba(P.hud, isMaj ? 0.7 : 0.3); x.lineWidth = isMaj ? 1.4 : 0.8;
      x.beginPath(); x.moveTo(gx, yy); x.lineTo(gx + (isMaj ? 12 : 6), yy); x.stroke();
      if (isMaj) {
        const dep = Math.round(t * (1200 + (instr === 'Spectro' ? 800 : 0)));
        x.fillStyle = K.rgba(P.ink, 0.75);
        x.fillText(('' + dep).padStart(4, '0') + 'm', gx + 16, yy);
      }
    }
    x.restore();
  }

  function stratumLabel(x, P, lx, y, name, kind, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const fs = 11;
    x.font = `${fs}px monospace`; x.textBaseline = 'middle';
    // leader line + node
    x.strokeStyle = K.rgba(P.hud, 0.5); x.lineWidth = 1;
    x.beginPath(); x.moveTo(lx, y); x.lineTo(lx + 14, y); x.stroke();
    x.fillStyle = K.rgba(P.hud, 0.8); x.beginPath(); x.arc(lx, y, 1.8, 0, 6.283); x.fill();
    // label text
    const tag = (kind.toUpperCase().slice(0, 4)) + '-' + (10 + Math.floor(r() * 89));
    x.fillStyle = K.rgba(P.ink, 0.85);
    x.fillText(tag, lx + 18, y);
    x.restore();
  }

  function seismoStrip(x, P, sx, top, bot, w, noise, r) {
    // a continuous seismograph strip running down the right margin
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.hud, 0.6); x.lineWidth = 1;
    x.beginPath();
    const cx = sx + w / 2;
    for (let yy = top; yy <= bot; yy += 3) {
      const t = (yy - top) / (bot - top);
      const v = (noise.fbm(yy / 30, 1.7, 4, 0.6, 2.2)) * w * 0.5
        + Math.sin(yy / (7 + r() * 4)) * w * 0.12 * (r() < 0.02 ? 4 : 1);
      const xx = cx + v;
      yy === top ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
    }
    x.stroke();
    // rail
    x.strokeStyle = K.rgba(P.hud, 0.2); x.lineWidth = 1;
    x.beginPath(); x.moveTo(sx, top); x.lineTo(sx, bot); x.moveTo(sx + w, top); x.lineTo(sx + w, bot); x.stroke();
    x.restore();
  }

  function scanColumn(x, P, W, H, kind, top, bot, r) {
    const cx = W * (0.3 + r() * 0.4);
    x.save();
    if (kind === 'Drill Line') {
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(P.ink, 0.6); x.lineWidth = 1.4;
      x.setLineDash([6, 6]);
      x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, bot); x.stroke();
      x.setLineDash([]);
      // drill bit marker
      K.bloom(x, cx, bot - (bot - top) * (0.1 + r() * 0.3), 18, P.hot, 0.5);
    } else { // Scan Column — a translucent vertical scan band with edge glow
      const cw = W * (0.05 + r() * 0.05);
      const g = x.createLinearGradient(cx - cw, 0, cx + cw, 0);
      g.addColorStop(0, K.rgba(P.glow, 0));
      g.addColorStop(0.5, K.rgba(P.glow, 0.1));
      g.addColorStop(1, K.rgba(P.glow, 0));
      x.globalCompositeOperation = 'screen';
      x.fillStyle = g; x.fillRect(cx - cw, top, cw * 2, bot - top);
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(P.ink, 0.4); x.lineWidth = 1;
      x.beginPath(); x.moveTo(cx - cw, top); x.lineTo(cx - cw, bot); x.moveTo(cx + cw, top); x.lineTo(cx + cw, bot); x.stroke();
    }
    x.restore();
  }

  function header(x, P, W, top, depth, instr, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const fs = Math.max(10, W * 0.013);
    x.font = `${fs}px monospace`; x.textBaseline = 'alphabetic';
    let hx = W * 0.06; const hy = top * 0.62;
    const title = `CORE-SAMPLE // ${depth.toUpperCase()} // ${instr.toUpperCase()}`;
    x.fillStyle = K.rgba(P.ink, 0.85); x.fillText(title, hx, hy);
    // glyph status strip
    let gx2 = W * 0.06; const gy = hy + fs * 1.4;
    for (let i = 0; i < K.rint(r, 10, 20); i++) {
      x.fillStyle = K.rgba(r() < 0.15 ? P.hot : P.hud, 0.4 + r() * 0.5);
      x.font = `${fs * 0.85}px monospace`;
      x.fillText(GLY[Math.floor(r() * GLY.length)], gx2, gy);
      gx2 += fs * (0.7 + r() * 0.7);
    }
    x.strokeStyle = K.rgba(P.hud, 0.4); x.lineWidth = 1;
    x.beginPath(); x.moveTo(W * 0.06, top * 0.85); x.lineTo(W * 0.94, top * 0.85); x.stroke();
    x.restore();
  }

  function readoutPanel(x, P, px, py, pw, ph, noise, r) {
    x.save();
    x.fillStyle = K.rgba(P.bg, 0.55); x.fillRect(px, py, pw, ph);
    x.strokeStyle = K.rgba(P.hud, 0.55); x.lineWidth = 1.1; x.strokeRect(px, py, pw, ph);
    const b = Math.min(pw, ph) * 0.18; x.lineWidth = 1.6; x.strokeStyle = K.rgba(P.ink, 0.8);
    [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]].forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
    x.save(); x.globalCompositeOperation = 'lighter';
    const kind = r();
    if (kind < 0.5) {
      // spectro waveform
      x.strokeStyle = K.rgba(P.hud, 0.9); x.lineWidth = 1.2; x.beginPath();
      const my = py + ph * 0.55, amp = ph * 0.32;
      for (let i = 0; i <= 70; i++) { const t = i / 70, xx = px + 5 + t * (pw - 10), yy = my + Math.sin(t * Math.PI * (4 + r() * 7) + r()) * amp * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); }
      x.stroke();
    } else {
      // strata composition bars
      const n = K.rint(r, 5, 9), bw = (pw - 10) / n;
      for (let i = 0; i < n; i++) { const bh = (ph * 0.7) * (0.15 + r()); x.fillStyle = K.rgba(r() < 0.2 ? P.hot : P.hud, 0.6 + r() * 0.35); x.fillRect(px + 5 + i * bw, py + ph - 5 - bh, bw * 0.66, bh); }
    }
    x.restore(); x.restore();
  }

  // ── main ────────────────────────────────────────────────────────────────
  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // void ground
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(P.bg, '#000', 0.4));
    bg.addColorStop(1, P.bg);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // margins: left depth gauge, right seismograph, top header
    const mL = W * 0.13;          // left gauge column
    const mR = W * 0.90;          // section right edge (right margin = seismo)
    const top = H * 0.085;        // header zone
    const bot = H * 0.965;
    const secX = mL, secW = mR - mL;
    const secTop = top, secBot = bot;
    const secH = secBot - secTop;

    // ── build strata bands (varied heights, deeper = hotter/denser) ──
    const n = p.count;
    // random band weights
    const weights = [];
    let wsum = 0;
    for (let i = 0; i < n; i++) { const ww = 0.5 + r() * 1.5; weights.push(ww); wsum += ww; }
    // assign kinds — deeper bands skew toward magma/circuit/crystal; ensure
    // at least one magma deep if Deep/Abyssal, and at least one void cavity.
    const kinds = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0 top .. 1 bottom
      let kind;
      if (t > 0.78 && r() < 0.55) kind = 'magma';
      else if (t > 0.6 && r() < 0.4) kind = K.pick(['circuit', 'crystal', 'magma'], r);
      else kind = K.pick(STRATA_KINDS, r);
      kinds.push(kind);
    }
    // force a void cavity somewhere in the middle ~half the time for breathing room
    if (r() < 0.55) kinds[K.rint(r, Math.floor(n * 0.25), Math.floor(n * 0.7))] = 'void';
    // force a deep magma if depth is Deep/Abyssal
    if ((p.depth === 'Deep' || p.depth === 'Abyssal') && !kinds.slice(Math.floor(n * 0.7)).includes('magma')) {
      kinds[n - 1] = 'magma';
    }

    // per-band accent palette — each stratum gets its OWN saturated colour so
    // the stack reads as a multi-coloured core, not one hot gradient. Deeper
    // bands bias warmer/hotter, shallower bias toward glow/vein/cool.
    const ACCENTS = [P.glow, P.vein, P.hot, K.mix(P.glow, P.vein, 0.5), K.mix(P.vein, P.hot, 0.4)];
    const bands = [];
    let y = secTop;
    for (let i = 0; i < n; i++) {
      const bh = secH * (weights[i] / wsum);
      const depth = i / (n - 1);              // 0 shallow .. 1 deep
      const kind = kinds[i];
      let lit;
      if (kind === 'magma') lit = K.mix(P.hot, P.glow, 0.15 + r() * 0.2);
      else {
        // pick an accent, then warm it with depth so the stack feels graded
        const acc = K.pick(ACCENTS, r);
        lit = K.mix(acc, P.hot, depth * 0.3 * r());
      }
      PAINTERS[kind](x, P, secX, y, secW, bh, depth, noise, r, lit);
      bands.push({ y, h: bh, kind, depth, lit, mid: y + bh / 2 });
      y += bh;
    }

    // boundaries between bands
    for (let i = 1; i < bands.length; i++) {
      boundary(x, P, secX, bands[i].y, secW, K.mix(bands[i - 1].lit, bands[i].lit, 0.5), r);
    }

    // ── hazy interlayer wash over the whole section for the cohesive "hazy" read
    K.hazeSheet(x, secX, secTop, noise, K.mix(P.rock, P.glow, 0.3), 0.12, 120, 'screen');
    // (hazeSheet ignores offset origin — apply to full canvas then mask isn't
    //  trivial; instead overlay a gentle full-frame haze tuned low)

    // ── RARE EVENTS ──
    if (p.event === 'Core Breach') {
      // a molten reactor core splits the lower rock — vertical hot rupture
      const bxp = secX + secW * (0.3 + r() * 0.4);
      const bw2 = secW * (0.06 + r() * 0.08);
      x.save(); x.globalCompositeOperation = 'screen';
      const g = x.createLinearGradient(bxp - bw2, 0, bxp + bw2, 0);
      g.addColorStop(0, K.rgba(P.hot, 0));
      g.addColorStop(0.5, K.rgba(K.mix(P.hot, '#fff', 0.3), 0.6));
      g.addColorStop(1, K.rgba(P.hot, 0));
      x.fillStyle = g;
      const ry0 = secTop + secH * (0.45 + r() * 0.2);
      x.fillRect(bxp - bw2, ry0, bw2 * 2, secBot - ry0);
      x.restore();
      x.save(); x.globalCompositeOperation = 'lighter';
      // bright fracture spider
      for (let i = 0; i < 10; i++) {
        let cx = bxp, cy = ry0 + (secBot - ry0) * r();
        x.strokeStyle = K.rgba('#fff', 0.4 + r() * 0.4); x.lineWidth = 0.6 + r() * 1.4;
        x.beginPath(); x.moveTo(cx, cy);
        for (let s = 0; s < 5; s++) { cx += (r() - 0.5) * secW * 0.2; cy += (r() - 0.4) * secH * 0.1; x.lineTo(cx, cy); }
        x.stroke();
      }
      K.bloom(x, bxp, secBot - secH * 0.1, secW * 0.4, P.hot, 0.4);
      x.restore();
    } else if (p.event === 'Fault Slip') {
      // tectonic glitch — shear the whole stack sideways along a fault line
      const fy = secTop + secH * (0.3 + r() * 0.4);
      const off = (r() < 0.5 ? -1 : 1) * secW * (0.04 + r() * 0.06);
      try {
        const fh = secBot - fy;
        const im = x.getImageData(secX, fy, secW, fh);
        x.clearRect(secX, fy, secW, fh);
        // refill void behind the slip
        x.fillStyle = P.bg; x.fillRect(secX, fy, secW, fh);
        x.putImageData(im, secX + off, fy);
      } catch (e) {}
      // glitch slices near the fault
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < K.rint(r, 6, 12); i++) {
        const sy = fy - secH * 0.06 + r() * secH * 0.12;
        const sh = 2 + r() * 8;
        x.fillStyle = K.rgba(r() < 0.4 ? P.hot : P.vein, 0.3 + r() * 0.4);
        x.fillRect(secX + (r() - 0.5) * 20, sy, secW, sh);
      }
      // hot seam along the fault
      x.strokeStyle = K.rgba(P.hot, 0.7); x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(secX, fy); x.lineTo(mR, fy); x.stroke();
      x.restore();
    }

    // ── TERMINAL OVERLAY ──
    header(x, P, W, top, p.depth, p.instr, r);
    depthGauge(x, P, mL - 4, secTop, secBot, n, bands, p.instr, r);
    // stratum labels — alternate sides, leader into the band
    for (let i = 0; i < bands.length; i++) {
      if (r() < 0.78) stratumLabel(x, P, mL + 4, bands[i].mid, p.depth, bands[i].kind, r);
    }
    // right-margin instrumentation: always a seismograph strip, plus one or two
    // SMALL composition panels tucked in the margin (never floating over rock).
    seismoStrip(x, P, mR + W * 0.012, secTop, secBot, W * 0.06, noise, r);
    {
      const pn = K.rint(r, 1, 2);
      for (let i = 0; i < pn; i++) {
        const ph = secH * (0.1 + r() * 0.05);
        const py = secTop + secH * (0.06 + r() * 0.75);
        readoutPanel(x, P, mR + W * 0.005, Math.min(py, secBot - ph), W * 0.075, ph, noise, r);
      }
    }

    // scan / drill column
    if (p.scan !== 'None') scanColumn(x, P, W, H, p.scan, secTop, secBot, r);

    // ── finish: CRT phosphor + haze + grain ──
    K.hazeSheet(x, W, H, noise, P.glow, 0.06, 220, 'screen');
    K.scanlines(x, W, H, 3, 0.13);
    K.chromaSplit(x, W, H, p.event === 'Fault Slip' ? 3 : 1);
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, 0.46);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k3_strata', draw, traits };
})();
