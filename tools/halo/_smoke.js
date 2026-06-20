window.ENGINE = {
  name: 'smoke',
  draw(cv, seed) {
    const K = window.KIT, r = K.rng(seed), W = 760, H = 760;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#06070d'; x.fillRect(0, 0, W, H);
    const noise = K.makeNoise(seed);
    K.hazeSheet(x, W, H, noise, '#16d0ff', 0.5, 120, 'screen');
    for (let i = 0; i < 40; i++) {
      K.bloom(x, r() * W, r() * H, 40 + r() * 120, K.hsl2hex(160 + r() * 80, 0.9, 0.6), 0.25);
    }
    K.grain(x, W, H, 600, r);
    K.vignette(x, W, H, 0.4);
    return { aspect: 1 };
  },
  traits(seed) { return { Seed: String(seed) }; },
};
