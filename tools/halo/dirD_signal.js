/* DIRECTION D — SIGNAL
 * Pure abstract: a storm of interfering signals — stacked oscilloscope waves,
 * spectrum bands, glitch slice-displacement, RGB-split ribbons and moiré drifting
 * through volumetric fog. The most painterly / abstract contender. Saturated,
 * hazy, textured, cyberpunk by way of signal-and-interference (no objects). */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Deep Cyber', bg: '#040a1a', a: '#1fa7b8', b: '#7cf6ff', c: '#3d8fff', hot: '#d6ffff' },
    { name: 'Toxic Acid', bg: '#0a1200', a: '#9be600', b: '#c6ff00', c: '#39ff14', hot: '#f0ffd0' },
    { name: 'Magenta',    bg: '#0a000c', a: '#b026ff', b: '#ff4fd8', c: '#ff1f8a', hot: '#ffd6f4' },
    { name: 'Reactor',    bg: '#03090a', a: '#1fbf6b', b: '#39ff9e', c: '#27ffd6', hot: '#e0fff0' },
    { name: 'Sodium',     bg: '#0a0600', a: '#ff9a1f', b: '#ffc000', c: '#ff5d3d', hot: '#fff0c8' },
    { name: 'Spectral',   bg: '#05030f', a: '#ff3d8a', b: '#3df0ff', c: '#b6ff1f', hot: '#ffffff' },
  ];
  const FMTS = [ { W: 1440, H: 1160, t: 'Scope' }, { W: 1300, H: 1300, t: 'Square' }, { W: 1120, H: 1480, t: 'Tower' } ];
  const FORM = ['Interference', 'Spectrum', 'Cascade', 'Standing Wave'];

  function params(r) {
    return { pal: K.pick(PALS, r), fmt: K.pick(FMTS, r), form: K.pick(FORM, r), bands: K.rint(r, 8, 18), glitch: r() < 0.6 };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Form: p.form, Glitch: p.glitch ? 'Torn' : 'Clean' }; }

  function wave(x, P, W, my, amp, col, freq, phase, alpha, lw) {
    x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = K.rgba(col, alpha); x.lineWidth = lw; x.beginPath();
    for (let i = 0; i <= W; i += 2) {
      const t = i / W;
      const env = Math.sin(t * Math.PI); // taper at edges
      const y = my + Math.sin(t * Math.PI * freq + phase) * amp * env
        + Math.sin(t * Math.PI * freq * 2.7 + phase * 1.7) * amp * 0.3 * env;
      i === 0 ? x.moveTo(i, y) : x.lineTo(i, y);
    }
    x.stroke(); x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const g = x.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, K.mix(P.bg, P.a, 0.06)); g.addColorStop(0.5, P.bg); g.addColorStop(1, K.mix(P.bg, '#000', 0.4));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    K.hazeSheet(x, W, H, noise, P.a, 0.4, 150, 'screen');

    const cols = [P.a, P.b, P.c, P.hot];

    if (p.form === 'Spectrum') {
      // tall spectrum bars, mirrored, with bloom caps
      const n = K.rint(r, 40, 90), bw = W / n;
      for (let i = 0; i < n; i++) {
        const t = i / n; const h = (0.15 + Math.pow(r(), 1.4)) * H * (0.5 + Math.sin(t * Math.PI) * 0.6);
        const col = cols[Math.floor(t * (cols.length - 0.01))];
        x.save(); x.globalCompositeOperation = 'lighter';
        const lg = x.createLinearGradient(0, H / 2 - h, 0, H / 2 + h);
        lg.addColorStop(0, K.rgba(col, 0)); lg.addColorStop(0.5, K.rgba(col, 0.7)); lg.addColorStop(1, K.rgba(col, 0));
        x.fillStyle = lg; x.fillRect(i * bw, H / 2 - h, bw * 0.78, h * 2);
        K.bloom(x, i * bw + bw * 0.4, H / 2 - h, bw * 3, col, 0.3);
        K.bloom(x, i * bw + bw * 0.4, H / 2 + h, bw * 3, col, 0.3);
        x.restore();
      }
    } else if (p.form === 'Cascade') {
      // stacked horizontal scope rows (waterfall) — a busy strata of traces
      const rows = K.rint(r, 14, 26);
      for (let i = 0; i < rows; i++) {
        const my = H * (0.06 + 0.88 * (i / (rows - 1)));
        const col = cols[i % cols.length];
        wave(x, P, W, my, H * (0.02 + r() * 0.05), col, 6 + r() * 30, r() * 6, 0.4 + r() * 0.4, 1 + r() * 1.5);
      }
    } else {
      // Interference / Standing Wave: many overlapping full-width waves
      const N = p.bands;
      for (let i = 0; i < N; i++) {
        const my = H * (0.5 + (i / N - 0.5) * (p.form === 'Standing Wave' ? 0.1 : 0.7)) + K.randn(r) * H * 0.04;
        const col = cols[Math.floor(r() * cols.length)];
        const amp = H * (0.08 + r() * 0.22) * (p.form === 'Standing Wave' ? 1.2 : 1);
        wave(x, P, W, my, amp, col, (p.form === 'Standing Wave' ? K.rint(r, 2, 7) : 2 + r() * 18), r() * Math.PI * 2, 0.3 + r() * 0.45, 1 + r() * 2.2);
      }
      // a couple of bright hero traces
      for (let i = 0; i < 2; i++) wave(x, P, W, H * (0.4 + r() * 0.2), H * 0.2, P.hot, 3 + r() * 8, r() * 6, 0.7, 2.4);
    }

    // RGB-split ribbon sweeps (chromatic energy bands)
    x.save(); x.globalCompositeOperation = 'lighter';
    const ribbons = K.rint(r, 3, 6);
    for (let i = 0; i < ribbons; i++) {
      const y0 = r() * H, y1 = y0 + K.randn(r) * H * 0.2;
      for (const [col, off] of [[P.b, -4], ['#ff3344', 0], [P.c, 4]]) {
        x.strokeStyle = K.rgba(col, 0.18); x.lineWidth = 6 + r() * 18;
        x.beginPath(); x.moveTo(-20, y0 + off); x.quadraticCurveTo(W / 2, (y0 + y1) / 2 + off, W + 20, y1 + off); x.stroke();
      }
    }
    x.restore();

    // glitch slice displacement
    if (p.glitch) {
      const slices = K.rint(r, 6, 16);
      for (let i = 0; i < slices; i++) { const sy = r() * H, sh = 4 + r() * 36, off = (r() - 0.5) * W * 0.14; try { const im = x.getImageData(0, sy, W, sh); x.putImageData(im, off, sy); } catch (e) {} }
    }

    // finish: chroma, scanlines (subtle), fog, grain, vignette
    K.chromaSplit(x, W, H, 2);
    K.scanlines(x, W, H, 4, 0.08);
    K.hazeSheet(x, W, H, noise, P.b, 0.08, 240, 'screen');
    K.grain(x, W, H, 460, r);
    K.vignette(x, W, H, 0.46);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'D_signal', draw, traits };
})();
