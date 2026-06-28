/* SPORE DRIFT — giant luminous drifters adrift in twilight air over a valley.
 * A hazy violet-night VALLEY OF AIR through which slow, translucent luminous
 * organisms drift at many depths: seed-pods, air-jellyfish, lantern-spores,
 * glowing spore-clusters. Strong depth-of-field — huge soft bokeh orbs near
 * camera, crisp drifters mid-ground, faint ones lost in fog far off. A faint
 * abstract land silhouette far below for scale.
 *
 * "Real but off": too many living lights, too calm, adrift in open air.
 * Territory = BIOLUMINESCENT VIOLET-NIGHT: deep indigo/aubergine grounds,
 * drifters glowing in saturated CYAN / LIME / MAGENTA bioluminescence.
 * NOT underwater, NOT cyberpunk, NOT synthwave, NOT rainbow.
 * Emphasis: depth-of-field, glow, translucency, atmosphere. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Each palette = a violet-night air valley. sky1=zenith, sky2=lower haze
  // glow, ground=deep murk floor, neonA/neonB/neonC = the three bioluminescent
  // drifter colours (one dominates per palette), ink=deepest shadow.
  const PALS = [
    { name: 'Cyan Vespers',   sky1: '#180a33', sky2: '#2a1158', ground: '#0a0520', neonA: '#34f0e0', neonB: '#7afcae', neonC: '#ff5cc8', ink: '#060212', dom: 0 },
    { name: 'Magenta Hush',   sky1: '#220a3a', sky2: '#3a0f52', ground: '#0d041c', neonA: '#ff52c2', neonB: '#a76bff', neonC: '#46f0e6', ink: '#08020f', dom: 0 },
    { name: 'Limewing Night', sky1: '#140e36', sky2: '#231a5e', ground: '#080620', neonA: '#aef74e', neonB: '#46f0c8', neonC: '#ff6ad0', ink: '#050314', dom: 0 },
    { name: 'Aubergine Glow', sky1: '#1e0a30', sky2: '#341050', ground: '#0c041a', neonA: '#3df0d6', neonB: '#ff5ab0', neonC: '#9b7bff', ink: '#070210', dom: 0 },
    { name: 'Indigo Bloom',   sky1: '#0f0c3a', sky2: '#1c1668', ground: '#070524', neonA: '#52d8ff', neonB: '#c486ff', neonC: '#7afcae', ink: '#040218', dom: 0 },
    { name: 'Orchid Drift',   sky1: '#260a40', sky2: '#420f5e', ground: '#0e0420', neonA: '#ff66cf', neonB: '#62f0ff', neonC: '#b6f55a', ink: '#08020f', dom: 0 },
    { name: 'Teal Aubergine', sky1: '#160a34', sky2: '#1a2a5c', ground: '#0a0420', neonA: '#2ef0d2', neonB: '#5ad8ff', neonC: '#ff6ab8', ink: '#050212', dom: 0 },
    { name: 'Violet Spore',   sky1: '#1c0c3e', sky2: '#301466', ground: '#0a051f', neonA: '#a86bff', neonB: '#46f0e0', neonC: '#ff5cc0', ink: '#060214', dom: 0 },
  ];

  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  const SPECIES = ['Lanterns', 'Air-Jellies', 'Seed-Pods', 'Spore-Clusters', 'Mixed'];
  const AIRS = ['Still', 'Updraft', 'Crosswind'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const species = K.pick(SPECIES, r);
    const air = K.pick(AIRS, r);
    const density = K.rint(r, 18, 30);          // mid-ground drifter count
    const bokeh = K.rint(r, 3, 6);              // huge near foreground orbs
    const event = r() < 0.08 ? K.pick(['Bloom Burst', 'Moonrise', 'Spore Fall'], r) : null;
    // pick which neon dominates
    const dom = K.pick([0, 0, 1, 2], r);
    return { pal, fmt, species, air, density, bokeh, event, dom };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = {
      Palette: p.pal.name,
      Frame: p.fmt.t,
      Drifters: p.species,
      Air: p.air,
      Density: p.density >= 26 ? 'Swarm' : p.density >= 22 ? 'Many' : 'Sparse',
    };
    if (p.event) t.Event = p.event;
    return t;
  }

  // neon colour for a drifter. Dominant leads, but we keep a real spread of the
  // OTHER two so the scene reads as "cyan AND magenta lights", never monochrome.
  function neonFor(P, dom, r) {
    const cols = [P.neonA, P.neonB, P.neonC];
    const roll = r();
    if (roll < 0.5) return cols[dom];                 // dominant
    if (roll < 0.78) return cols[(dom + 1) % 3];      // contrast accent
    return cols[(dom + 2) % 3];                        // second accent
  }

  /* ── deep violet-night air: vertical gradient, cooler & lighter near the
       valley floor where distant haze glows, darkest at zenith ── */
  function skyGradient(x, P, W, H) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.sky1, '#000', 0.35));
    g.addColorStop(0.28, P.sky1);
    g.addColorStop(0.62, K.mix(P.sky1, P.sky2, 0.7));
    g.addColorStop(0.82, P.sky2);
    g.addColorStop(0.93, K.mix(P.sky2, P.ground, 0.45));
    g.addColorStop(1, P.ground);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // a broad cool glow lobe seated low (distant valley luminescence / fog light)
    x.save(); x.globalCompositeOperation = 'screen';
    const gl = x.createRadialGradient(W * 0.5, H * 0.82, 0, W * 0.5, H * 0.82, W * 0.7);
    const glowCol = K.mix(P.sky2, [P.neonA, P.neonB, P.neonC][P.__dom != null ? P.__dom : 0], 0.18);
    gl.addColorStop(0, K.rgba(glowCol, 0.3));
    gl.addColorStop(0.5, K.rgba(glowCol, 0.1));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, H);
    x.restore();
  }

  /* ── volumetric air haze: large soft fbm sheets, layered cool tones.
       this is what sells "deep hazy air with depth" ── */
  function airHaze(x, P, W, H, noise, r) {
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.sky1, 0.3), 0.16, 520 + r() * 240, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.ink, 0.2), 0.10, 320 + r() * 160, 'screen');
    // a low warmer-cool band of fog near the valley floor
    x.save(); x.globalCompositeOperation = 'screen';
    const fg = x.createLinearGradient(0, H * 0.6, 0, H);
    fg.addColorStop(0, 'rgba(0,0,0,0)');
    fg.addColorStop(0.6, K.rgba(K.mix(P.sky2, P.neonB, 0.12), 0.14));
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fg; x.fillRect(0, H * 0.6, W, H * 0.4);
    x.restore();
    // fine dust grain over the whole air
    K.hazeSheet(x, W, H, noise, K.mix(P.sky1, P.sky2, 0.5), 0.04, 150, 'overlay');
  }

  /* ── faint abstract land silhouette far below, for scale.
       low, soft, broken ridgeline lost in fog ── */
  function landBelow(x, P, W, H, noise, r) {
    const baseY = H * (0.86 + r() * 0.05);
    // a couple of overlapping ridge layers, far → near, each fainter & higher fog
    const layers = 2 + (r() < 0.5 ? 1 : 0);
    for (let L = 0; L < layers; L++) {
      const y0 = baseY + L * H * 0.035;
      const amp = (16 + L * 18) + r() * 22;
      const col = K.mix(P.ground, P.ink, 0.35 + L * 0.2);
      const fogA = 0.62 - L * 0.12;
      x.save();
      x.fillStyle = K.rgba(col, fogA);
      x.beginPath(); x.moveTo(0, H);
      x.lineTo(0, y0);
      for (let xx = 0; xx <= W; xx += 10) {
        const yy = y0 - (noise.fbm(xx / (260 + L * 80), L * 7.3 + 2, 4) + 0.4) * amp;
        x.lineTo(xx, yy);
      }
      x.lineTo(W, H); x.closePath(); x.fill();
      x.restore();
    }
    // soft fog band hugging the land so it sinks into the air
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, baseY - H * 0.1, 0, baseY + H * 0.06);
    hb.addColorStop(0, 'rgba(0,0,0,0)');
    hb.addColorStop(0.55, K.rgba(K.mix(P.sky2, P.neonA, 0.1), 0.12));
    hb.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hb; x.fillRect(0, baseY - H * 0.1, W, H * 0.16);
    x.restore();
    return baseY;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     DRIFTERS. Each is a translucent luminous organism. Depth `d` in [0,1]:
       d≈0  → far, tiny, faint, very hazy (lost in fog)
       d≈1  → near, large, but the NEAREST become out-of-focus BOKEH orbs.
     A drifter's focus is separate: near AND far drifters can be soft; only the
     mid-ground band is crisp. This is the depth-of-field signature.
     ───────────────────────────────────────────────────────────────────────── */

  // a soft glowing translucent orb (bokeh / lantern body)
  function glowOrb(x, cx, cy, rad, col, core, soft) {
    // outer atmospheric bloom
    K.bloom(x, cx, cy, rad * 2.2, col, 0.14 * core);
    x.save();
    x.globalCompositeOperation = 'lighter';
    // translucent body: bright rim, hollow-ish centre when soft (bokeh look)
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    if (soft > 0.5) {
      // out-of-focus bokeh: saturated coloured body, brighter ring near edge
      g.addColorStop(0, K.rgba(col, 0.14 * core));
      g.addColorStop(0.55, K.rgba(col, 0.16 * core));
      g.addColorStop(0.82, K.rgba(K.mix(col, '#fff', 0.22), 0.34 * core));
      g.addColorStop(0.95, K.rgba(col, 0.20 * core));
      g.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      g.addColorStop(0, K.rgba(K.mix(col, '#fff', 0.5), 0.5 * core));
      g.addColorStop(0.4, K.rgba(col, 0.32 * core));
      g.addColorStop(0.8, K.rgba(col, 0.12 * core));
      g.addColorStop(1, 'rgba(0,0,0,0)');
    }
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    x.restore();
  }

  // air-jellyfish: a translucent bell + trailing luminous filaments
  function jelly(x, P, noise, cx, cy, rad, col, focus, r) {
    const soft = focus;
    K.bloom(x, cx, cy, rad * 2.0, col, 0.12 * (1 - soft * 0.4));
    x.save();
    x.globalCompositeOperation = 'lighter';
    // bell — soft half-dome
    const bg = x.createRadialGradient(cx, cy - rad * 0.2, rad * 0.1, cx, cy, rad);
    bg.addColorStop(0, K.rgba(K.mix(col, '#fff', 0.4), (soft > 0.5 ? 0.16 : 0.4)));
    bg.addColorStop(0.6, K.rgba(col, (soft > 0.5 ? 0.12 : 0.22)));
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = bg;
    x.beginPath();
    x.ellipse(cx, cy, rad, rad * 0.82, 0, Math.PI, Math.PI * 2);
    x.ellipse(cx, cy, rad, rad * 0.45, 0, 0, Math.PI);
    x.fill();
    // bright rim along the bell crown
    x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.5), soft > 0.5 ? 0.12 : 0.4);
    x.lineWidth = Math.max(1, rad * 0.04);
    x.beginPath(); x.ellipse(cx, cy, rad * 0.96, rad * 0.78, 0, Math.PI * 1.04, Math.PI * 1.96); x.stroke();
    // trailing filaments
    const nf = 5 + Math.floor(r() * 5);
    for (let i = 0; i < nf; i++) {
      const fx = cx + (i / (nf - 1) - 0.5) * rad * 1.3;
      const len = rad * (1.4 + r() * 1.6);
      x.strokeStyle = K.rgba(col, (soft > 0.5 ? 0.06 : 0.18) * (0.6 + r() * 0.6));
      x.lineWidth = Math.max(0.6, rad * (0.02 + r() * 0.02));
      x.beginPath(); x.moveTo(fx, cy + rad * 0.3);
      let px = fx, py = cy + rad * 0.3;
      const sway = (r() - 0.5) * rad * 0.6;
      for (let t = 0; t <= 1; t += 0.12) {
        const ny = cy + rad * 0.3 + t * len;
        const nx = fx + Math.sin(t * 4 + i) * sway * t + noise.fbm(fx / 60, ny / 60 + i, 2) * rad * 0.3;
        x.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
        px = nx; py = ny;
      }
      x.stroke();
    }
    x.restore();
  }

  // seed-pod: an elongated luminous capsule with internal seed-dots
  function pod(x, P, noise, cx, cy, rad, col, focus, r) {
    const soft = focus;
    const rot = (r() - 0.5) * 1.2;
    K.bloom(x, cx, cy, rad * 1.9, col, 0.11 * (1 - soft * 0.4));
    x.save();
    x.translate(cx, cy); x.rotate(rot);
    x.globalCompositeOperation = 'lighter';
    const w = rad * 0.62, h = rad * 1.25;
    const g = x.createRadialGradient(0, 0, 0, 0, 0, h);
    g.addColorStop(0, K.rgba(K.mix(col, '#fff', 0.4), soft > 0.5 ? 0.16 : 0.36));
    g.addColorStop(0.6, K.rgba(col, soft > 0.5 ? 0.12 : 0.2));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); x.fill();
    // bright seam
    x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.5), soft > 0.5 ? 0.14 : 0.42);
    x.lineWidth = Math.max(0.8, rad * 0.03);
    x.beginPath(); x.moveTo(0, -h * 0.9); x.lineTo(0, h * 0.9); x.stroke();
    // internal seed dots
    if (soft < 0.5) {
      const ns = 4 + Math.floor(r() * 5);
      for (let i = 0; i < ns; i++) {
        const sy = (i / (ns - 1) - 0.5) * h * 1.2;
        const sx = (r() - 0.5) * w * 0.5;
        x.fillStyle = K.rgba(K.mix(col, '#fff', 0.6), 0.5 + r() * 0.3);
        x.beginPath(); x.arc(sx, sy, Math.max(1, rad * 0.05), 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }

  // spore-cluster: a cohesive luminous body — a soft translucent envelope with a
  // denser glowing core of seeds inside, so it reads as ONE organism not confetti
  function cluster(x, P, noise, cx, cy, rad, col, focus, r) {
    const soft = focus;
    K.bloom(x, cx, cy, rad * 2.0, col, 0.12 * (1 - soft * 0.4));
    x.save();
    x.globalCompositeOperation = 'lighter';
    // 1. translucent envelope membrane (gives the cluster a body)
    const eg = x.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    eg.addColorStop(0, K.rgba(col, soft > 0.5 ? 0.12 : 0.22));
    eg.addColorStop(0.7, K.rgba(col, soft > 0.5 ? 0.06 : 0.1));
    eg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = eg; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    // 2. seeds inside — denser toward centre (Gaussian-ish falloff)
    const n = 16 + Math.floor(r() * 22);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const rr = Math.pow(r(), 1.4) * rad * 0.92;   // bias inward
      const dx = cx + Math.cos(a) * rr;
      const dy = cy + Math.sin(a) * rr * 0.92;
      const s = Math.max(0.7, rad * (0.04 + r() * 0.08)) * (soft > 0.5 ? 1.7 : 1);
      const cc = r() < 0.35 ? K.mix(col, '#fff', 0.55) : col;
      x.fillStyle = K.rgba(cc, (soft > 0.5 ? 0.16 : 0.46) * (0.55 + r() * 0.55));
      x.beginPath(); x.arc(dx, dy, s, 0, Math.PI * 2); x.fill();
    }
    // 3. a few faint connecting strands between near seeds (organism feel)
    if (soft < 0.5) {
      x.strokeStyle = K.rgba(col, 0.1); x.lineWidth = Math.max(0.5, rad * 0.012);
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2, rr = rad * (0.2 + r() * 0.5);
        x.beginPath(); x.moveTo(cx, cy);
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); x.stroke();
      }
    }
    x.restore();
  }

  // lantern: a crisp-ish glowing globe with a soft inner membrane + tendril
  function lantern(x, P, noise, cx, cy, rad, col, focus, r) {
    glowOrb(x, cx, cy, rad, col, 1 - focus * 0.35, focus);
    if (focus < 0.5) {
      // a faint membrane ring + a couple of short tendrils
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.22);
      x.lineWidth = Math.max(0.8, rad * 0.03);
      x.beginPath(); x.arc(cx, cy, rad * 0.68, 0, Math.PI * 2); x.stroke();
      const nt = 2 + Math.floor(r() * 3);
      for (let i = 0; i < nt; i++) {
        const len = rad * (0.8 + r() * 1.0);
        x.strokeStyle = K.rgba(col, 0.14);
        x.lineWidth = Math.max(0.6, rad * 0.02);
        x.beginPath(); x.moveTo(cx + (r() - 0.5) * rad * 0.6, cy + rad * 0.8);
        x.quadraticCurveTo(cx + (r() - 0.5) * rad, cy + rad * 0.8 + len * 0.6, cx + (r() - 0.5) * rad * 0.8, cy + rad * 0.8 + len);
        x.stroke();
      }
      x.restore();
    }
  }

  function drawDrifter(x, P, noise, kind, cx, cy, rad, col, focus, r) {
    switch (kind) {
      case 'jelly': jelly(x, P, noise, cx, cy, rad, col, focus, r); break;
      case 'pod': pod(x, P, noise, cx, cy, rad, col, focus, r); break;
      case 'cluster': cluster(x, P, noise, cx, cy, rad, col, focus, r); break;
      default: lantern(x, P, noise, cx, cy, rad, col, focus, r); break;
    }
  }

  function kindForSpecies(species, r) {
    if (species === 'Lanterns') return 'lantern';
    if (species === 'Air-Jellies') return 'jelly';
    if (species === 'Seed-Pods') return 'pod';
    if (species === 'Spore-Clusters') return 'cluster';
    return K.pick(['lantern', 'jelly', 'pod', 'cluster'], r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = Object.assign({ __dom: p.dom }, p.pal);
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // 1. air + atmosphere
    skyGradient(x, P, W, H);
    airHaze(x, P, W, H, noise, r);

    // 2. distant micro-drifters lost in fog (tiny faint specks high & far)
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const mx = r() * W, my = r() * H * 0.85;
      const s = 0.4 + r() * 1.4;
      const c = neonFor(P, p.dom, r);
      x.fillStyle = K.rgba(c, 0.05 + r() * 0.16);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();

    // 3. land far below for scale (behind mid drifters)
    landBelow(x, P, W, H, noise, r);

    // 4. FAR drifters — small, faint, hazy (behind everything mid)
    const far = K.rint(r, 6, 11);
    for (let i = 0; i < far; i++) {
      const d = 0.05 + r() * 0.18;
      const cx = r() * W, cy = H * (0.15 + r() * 0.6);
      const rad = (W * 0.012) + d * W * 0.04;
      const focus = 0.65 + r() * 0.25;            // far = soft
      const col = neonFor(P, p.dom, r);
      drawDrifter(x, P, noise, kindForSpecies(p.species, r), cx, cy, rad, col, focus, r);
    }

    // a haze veil to sink the far drifters into the air
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.sky1, 0.4), 0.07, 300, 'screen');

    // 5. MID-GROUND drifters — the crisp, in-focus heroes. varied depth/size,
    //    scattered with vertical spread; bigger ones lower & slightly forward.
    const mid = p.density;
    const placed = [];
    for (let i = 0; i < mid; i++) {
      // depth follows a curve so we get a real spread of sizes, not a uniform band
      const d = 0.25 + Math.pow(r(), 1.5) * 0.6;
      const cx = r() * W;
      // vertical placement weighted so bigger (nearer) drifters sit a touch lower
      const cy = H * (0.1 + r() * 0.78) * (1 - d * 0.06) + d * H * 0.05;
      const rad = (W * 0.02) + d * W * 0.085;
      // mid band is crisp; a few stragglers slightly soft for depth variety
      const focus = r() < 0.78 ? r() * 0.32 : 0.4 + r() * 0.2;
      const col = neonFor(P, p.dom, r);
      placed.push({ cx, cy, rad, focus, col, kind: kindForSpecies(p.species, r) });
    }
    // draw smaller/farther first
    placed.sort((a, b) => a.rad - b.rad);
    for (const m of placed) drawDrifter(x, P, noise, m.kind, m.cx, m.cy, m.rad, m.col, m.focus, r);

    // 6. drifting motes / spores in the air between layers (life + texture)
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 220; i++) {
      const mx = r() * W, my = r() * H;
      const s = 0.4 + r() * 2.2;
      const soft = r() < 0.25;
      // cool white motes (lean blue, never warm) so no gold/yellow creep on magenta seeds
      const c = r() < 0.55 ? neonFor(P, p.dom, r) : K.mix(K.mix(P.sky2, '#cfe6ff', 0.5), '#fff', 0.25);
      if (soft) { K.bloom(x, mx, my, s * 8, c, 0.05); }
      x.fillStyle = K.rgba(c, 0.1 + r() * 0.4);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();

    // 7. event flourishes
    if (p.event === 'Moonrise') {
      const mx = W * (0.2 + r() * 0.6), my = H * (0.18 + r() * 0.2), mr = W * (0.06 + r() * 0.04);
      K.bloom(x, mx, my, mr * 3, K.mix(P.sky2, '#fff', 0.4), 0.3);
      const g = x.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      g.addColorStop(0, K.rgba(K.mix(P.sky2, '#fff', 0.6), 0.5));
      g.addColorStop(1, K.rgba(P.sky2, 0.05));
      x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = g;
      x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill(); x.restore();
    } else if (p.event === 'Spore Fall') {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) {
        const sx = r() * W, sy = r() * H, len = 8 + r() * 26;
        const c = neonFor(P, p.dom, r);
        x.strokeStyle = K.rgba(c, 0.18 + r() * 0.2); x.lineWidth = 0.8 + r();
        x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 6, sy + len); x.stroke();
      }
      x.restore();
    }

    // 8. NEAR FOREGROUND BOKEH — huge out-of-focus glowing orbs near camera.
    //    These are the depth-of-field signature: big, soft, ring-bright bokeh.
    const bokeh = p.bokeh + (p.event === 'Bloom Burst' ? 3 : 0);
    for (let i = 0; i < bokeh; i++) {
      const cx = r() * W;
      // bias toward edges/corners so they frame rather than block centre
      const cy = (r() < 0.5 ? r() * H * 0.4 : H * 0.6 + r() * H * 0.4);
      const rad = W * (0.07 + r() * 0.12);
      const col = neonFor(P, p.dom, r);
      glowOrb(x, cx, cy, rad, col, 0.95 + r() * 0.35, 1);   // soft=1 → bokeh ring, saturated
    }

    // 9. finishing atmosphere
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.neonA, 0.06), 0.05, 240, 'screen');
    // gentle cool top-down darkening for air depth
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(K.mix(P.sky1, '#000', 0.5), 0.34));
    tg.addColorStop(0.45, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);
    K.grain(x, W, H, 540, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.34); x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_sporedrift', draw, traits };
})();
