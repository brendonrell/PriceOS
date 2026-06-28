# HALO R&D — engine builder brief (read fully before coding)

You are building ONE generative art engine for PriceOS's "halo" project search —
the platform's best-ever art project. Output is a single browser-JS file that the
render harness loads. This must look like **premium, gallery-grade generative
art** that sophisticated collectors ("art snobs") respect. Mediocre = rejected.

## The hard creative rules (from the CEO, non-negotiable)
1. **ALL-NEW look & feel.** The catalog already has lots of literal/representational
   scenes and neon/cyberpunk. Yours must NOT be either. No neon, no outrun, no
   literal cityscapes, no glow-orb-on-gradient.
2. **Surreal = real-but-off** as an UNDERCURRENT, not the whole game. "Real but
   wrong": impossible assemblies, gravity that disobeys, diagrams of objects that
   can't exist, a familiar thing made uncanny. NOT psychedelic, NOT trippy.
3. **Hazy, cool, textured, unique.** Every frame needs atmosphere (haze) and
   real surface texture (grain/mottle), never flat vector cleanliness alone.
4. **Distinct palette world.** Your project owns a palette nobody else has. It
   must read as a *different project from across the room* — by colour and by
   composition. Muted/sophisticated beats saturated/loud unless the brief says so.
5. **High internal variation.** Across seeds, the SET must not look like one image
   reskinned. 5–6 structurally distinct compositions/modes + your palette set.

## The engine contract (match this EXACTLY)
```js
window.ENGINE = (function () {
  const K = window.KIT;            // preloaded; see kit.js (tools/halo/kit.js)
  const PALS = [ /* 5–6 bespoke named palettes, all in YOUR palette world */ ];
  const MODES = [ /* 5–6 named compositions */ ];
  function pickPal(r){ if(window.FORCE_PAL){const p=PALS.find(p=>p.name===window.FORCE_PAL); if(p)return p;} return K.pick(PALS,r); }
  function draw(cv, seed){
    const r = K.rng(seed);          // deterministic RNG — ALL randomness via r()
    const noise = K.makeNoise(seed*7+1);
    const pal = pickPal(r);
    // choose a format (set cv.width/cv.height yourself), paint, texture, haze.
    return { aspect: cv.width/cv.height };
  }
  function traits(seed){            // PURE, deterministic, no canvas. Mirror draw()'s rng order.
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find(p=>p.name===window.FORCE_PAL)||PALS[0]) : K.pick(PALS,r);
    return { Palette: pal.name, /* Mode, Format, + 1–2 more */ };
  }
  return { name: 'sNN_yourname', draw, traits };
})();
```
- Deterministic in `seed` (same seed → same image). Use `r()` for all randomness.
- Support `window.FORCE_PAL` (the colorway jury forces one palette across a fixed seed).
- Pick a format per seed from 2–3 aspect options (portrait/square/landscape) — vary it.
- Render native ~1000–1300px long edge inside draw() (set cv.width/cv.height).

## KIT helpers you have (window.KIT — read kit.js for exact signatures)
- RNG/util: `rng(seed)`, `pick(a,r)`, `rint(r,a,b)`, `shuffle(a,r)`, `randn(r)`, `clamp(v,a,b)`, `PHI`, `INVPHI`
- Colour: `h2r/r2h`, `mix(a,b,t)`, `lum(h)`, `rgba(h,a)`, `hsl2hex(h,s,l)`, `iridescent(phase,sat,light)`
- Texture: `grain(x,W,H,amt,r)`, `mottle(x,x0,y0,w,h,col,density,r,blend)`, `vignette(x,W,H,s)`, `scanlines`
- Noise: `makeNoise(seed)` → `{noise2(x,y), fbm(x,y,oct,gain,lac)}`; `curl(noise,x,y,eps)`
- Atmosphere: `bloom(x,cx,cy,rad,col,a0)`, `sheen`, `hazeSheet(x,W,H,noise,col,opacity,scale,blend)`, `softShadow`
- Metal: `chromeRamp(x,x0,y0,w,h,ang,base)`; FX: `chromaSplit(x,W,H,off)`
Use `hazeSheet` + `grain` + `vignette` for the signature hazy/textured grade. Use
`mottle` for material surface noise. `fbm`/`curl` for organic flow/displacement.

## How to self-verify (you MUST do this, iterate until premium)
```
cd /home/user/PriceOS
export PW_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
node tools/halo/render.mjs tools/halo/sNN_yourname.js <OUTDIR> 1,2,3,4,5,6 720 3
```
Then **Read the contact sheet PNG** (`<OUTDIR>/_contact_sNN_yourname.png`) WITH YOUR
OWN EYES (vision). Critique it against this brief. Iterate at least 2–3 passes:
fix weak composition, dead space, muddy colour, missing texture/haze, sameness
across seeds. Stop only when it looks gallery-grade and on-brief.

## Reference exemplar (quality bar, structure to imitate — NOT the style to copy)
`tools/halo/s01_vestibule.js` — note: palette objects, mode switch, format pick,
layered haze+grain+vignette grade, traits() mirroring draw(). Your STYLE must be
completely different from it.

## Deliverable (return to orchestrator)
- The engine file path, the contact-sheet path, your list of palette names + mode
  names, and a 2–3 line honest self-assessment (what's strong, what's weak).
