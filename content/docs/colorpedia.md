---
title: "Colorpedia"
description: "The book about one color: exact hex, RGB, HSL, HSV, CMYK, LAB and LCH, the color's name and history, its harmonies, and a search that reads names, hex and numbers alike."
category: "app"
keywords: ["colorpedia", "color", "color", "hex", "rgb", "cmyk", "hsl", "lab", "lch", "colorway", "palette", "harmony", "contrast", "pigment", "color names"]
last_updated: "2026-08-01"
---

# Colorpedia ◉

Every Project on PD carries a **colorway** — the one color it paints the app in. Colorpedia is what sits behind it: tap the ◉ Colorway tile on a Project's Attributes and the whole book on that color opens.

**How:** Tap the ◉ Colorway tile on a Project's Attributes to open the book on that color.

<svg viewBox="0 0 720 230" role="img" aria-labelledby="colorpedia-anatomy-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="colorpedia-anatomy-title">The Colorpedia card, annotated: the color swatch and its name with the honest nearest-neighbour distance, the computed formats you can tap to copy, the read in words, the history when the color has one, and the tappable harmonies that re-read the card without closing it.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="10" width="700" height="210" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="34" y="44" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<rect x="56" y="28" width="90" height="60" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="52" fill="currentColor" text-anchor="start" font-size="13">TYRIAN PURPLE</text>
<text x="160" y="74" fill="currentColor" text-anchor="start" font-size="11" font-weight="normal">nearest named · ΔE 3.1</text>
<text x="34" y="124" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<rect x="56" y="104" width="92" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="102" y="122" fill="currentColor" text-anchor="middle" font-size="12">HEX</text>
<rect x="158" y="104" width="92" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="204" y="122" fill="currentColor" text-anchor="middle" font-size="12">RGB</text>
<rect x="260" y="104" width="92" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="306" y="122" fill="currentColor" text-anchor="middle" font-size="12">HSL</text>
<rect x="362" y="104" width="92" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="408" y="122" fill="currentColor" text-anchor="middle" font-size="12">CMYK</text>
<rect x="464" y="104" width="92" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="122" fill="currentColor" text-anchor="middle" font-size="12">LAB</text>
<rect x="566" y="104" width="92" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="612" y="122" fill="currentColor" text-anchor="middle" font-size="12">LCH</text>
<text x="34" y="164" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<text x="56" y="164" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">the read: family · lightness · warmth · contrast vs black and white</text>
<text x="34" y="196" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<text x="56" y="196" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">harmonies: complement · triad · analogous · split · shades — all tappable</text>
</g>
</svg>

- **①&#xFE0E; The name** — from the fixed dictionary, with the honest distance when the match isn't exact.
- **②&#xFE0E; The formats** — computed exactly; tap any one to copy it.
- **③&#xFE0E; The read** — the same maths, in words.
- **④&#xFE0E; The harmonies** — tap a swatch and the whole card re-reads for that color without closing.

## What it tells you

**The numbers are computed, exactly, from the color itself.** No lookup is involved, so they hold for any color at all — a Project's colorway, or a hex pulled off a piece of art:

- **HEX** · **RGB** · **HSL** · **HSV** — the four everyday ways of writing a color.
- **CMYK** — the uncalibrated screen conversion, the same one a design tool shows next to a hex. A press profile will differ, and the card says so rather than pretending otherwise.
- **LAB** and **LCH** — the perceptual coordinates, where distance between two colors means what your eye means by it.

Tap any one of them to copy it.

**The read** puts words to the same maths: the color's family, how light it sits, how pure the hue is, whether it runs warm or cool, its luminance, and its contrast against black and white — the number that decides whether text will actually be legible on it.

## The name, and the honesty about it

Color names come from a fixed dictionary of real, documented colors baked into the app — hundreds of them, from the CSS keywords through the pigments, dyes, and heritage colors. **Nothing is generated while you are looking at it**, so nothing can be invented on the spot.

A color that isn't in the book **snaps to its nearest neighbour** by perceptual distance, and the card tells you which one and how far away it landed — *nearest named color · very close · ΔE 3.1*. When the match isn't exact and a history is shown, the card says plainly that it is the neighbour's history, not that hex's own. A color with no story attached shows none; an empty line beats an invented one.

## The history

Around a third of the dictionary carries the color's actual story — why Tyrian purple was a capital offence to wear, what Prussian blue was made from by accident, why the CSS keyword `green` is only half-strength, which color was added to the web as a memorial. It's there when the color has one and absent when it doesn't.

## Harmonies

Underneath, the color's relatives, computed on the wheel: **complement**, **triad**, **analogous**, **split**, and a **shades** ladder. Every swatch is tappable — tap it and the whole card re-reads for that color without closing. The same goes for the **neighbours** list: the named colors sitting closest to this one, with the distance to each.

## The search

One field at the top of the card, and it reads whichever way you think about color:

- a **name** — `cinnabar`, `tyrian purple`, `cosmic latte`
- a **hex** — `#e8ff47`, `e8ff47`, `#f00`
- **RGB** — `255, 0, 0` or `rgb(255,0,0)`
- **CMYK** — `cmyk(0,100,100,0)` or four bare numbers
- **HSL** — `hsl(0,100%,50%)` or `0deg 100% 50%`

Type numbers and the card shows you the color it understood, tappable to open. Type a word and it lists the matching names. Searching never closes the card — nothing you do inside it does. It closes on the ×, a tap outside, or Esc.

## From the Command Stone

The same book answers in [the Command Stone](/docs/command-stone): `color cinnabar`, `colour tyrian purple`, a bare hex, or a tagged `rgb(…)` / `cmyk(…)` / `hsl(…)`. The stone's card adds two things the modal can't: **which Projects wear that color**, and **the real minted pieces across every Project that read as it** — both tappable straight through to the work.

(The stone's separate `stonecolor:` command is a different thing entirely: that repaints the stone itself.)

## Further reading

- [Projects & Minting](/docs/app/projects-and-minting) — where the Colorway tile lives
- [The Fingerprint](/docs/fingerprint) — what PD reads off the art's own colors
- [Command Stone](/docs/command-stone)
