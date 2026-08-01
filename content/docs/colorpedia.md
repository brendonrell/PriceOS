---
title: "Colorpedia"
description: "The book about one colour: exact hex, RGB, HSL, HSV, CMYK, LAB and LCH, the colour's name and history, its harmonies, and a search that reads names, hex and numbers alike."
category: "app"
keywords: ["colorpedia", "colour", "color", "hex", "rgb", "cmyk", "hsl", "lab", "lch", "colorway", "palette", "harmony", "contrast", "pigment", "colour names"]
last_updated: "2026-08-01"
---

# Colorpedia ◉

Every Project on PD carries a **colorway** — the one colour it paints the app in. Colorpedia is what sits behind it: tap the ◉ Colorway tile on a Project's Attributes and the whole book on that colour opens.

## What it tells you

**The numbers are computed, exactly, from the colour itself.** No lookup is involved, so they hold for any colour at all — a Project's colorway, or a hex pulled off a piece of art:

- **HEX** · **RGB** · **HSL** · **HSV** — the four everyday ways of writing a colour.
- **CMYK** — the uncalibrated screen conversion, the same one a design tool shows next to a hex. A press profile will differ, and the card says so rather than pretending otherwise.
- **LAB** and **LCH** — the perceptual coordinates, where distance between two colours means what your eye means by it.

Tap any one of them to copy it.

**The read** puts words to the same maths: the colour's family, how light it sits, how pure the hue is, whether it runs warm or cool, its luminance, and its contrast against black and white — the number that decides whether text will actually be legible on it.

## The name, and the honesty about it

Colour names come from a fixed dictionary of real, documented colours baked into the app — hundreds of them, from the CSS keywords through the pigments, dyes, and heritage colours. **Nothing is generated while you are looking at it**, so nothing can be invented on the spot.

A colour that isn't in the book **snaps to its nearest neighbour** by perceptual distance, and the card tells you which one and how far away it landed — *nearest named colour · very close · ΔE 3.1*. When the match isn't exact and a history is shown, the card says plainly that it is the neighbour's history, not that hex's own. A colour with no story attached shows none; an empty line beats an invented one.

## The history

Around a third of the dictionary carries the colour's actual story — why Tyrian purple was a capital offence to wear, what Prussian blue was made from by accident, why the CSS keyword `green` is only half-strength, which colour was added to the web as a memorial. It's there when the colour has one and absent when it doesn't.

## Harmonies

Underneath, the colour's relatives, computed on the wheel: **complement**, **triad**, **analogous**, **split**, and a **shades** ladder. Every swatch is tappable — tap it and the whole card re-reads for that colour without closing. The same goes for the **neighbours** list: the named colours sitting closest to this one, with the distance to each.

## The search

One field at the top of the card, and it reads whichever way you think about colour:

- a **name** — `cinnabar`, `tyrian purple`, `cosmic latte`
- a **hex** — `#e8ff47`, `e8ff47`, `#f00`
- **RGB** — `255, 0, 0` or `rgb(255,0,0)`
- **CMYK** — `cmyk(0,100,100,0)` or four bare numbers
- **HSL** — `hsl(0,100%,50%)` or `0deg 100% 50%`

Type numbers and the card shows you the colour it understood, tappable to open. Type a word and it lists the matching names. Searching never closes the card — nothing you do inside it does. It closes on the ×, a tap outside, or Esc.

## From the Command Stone

The same book answers in [the Command Stone](/docs/command-stone): `color cinnabar`, `colour tyrian purple`, a bare hex, or a tagged `rgb(…)` / `cmyk(…)` / `hsl(…)`. The stone's card adds two things the modal can't: **which Projects wear that colour**, and **the real minted pieces across every Project that read as it** — both tappable straight through to the work.

(The stone's separate `stonecolor:` command is a different thing entirely: that repaints the stone itself.)

## Further reading

- [Projects & Minting](/docs/app/projects-and-minting) — where the Colorway tile lives
- [The Fingerprint](/docs/fingerprint) — what PD reads off the art's own colours
- [Command Stone](/docs/command-stone)
