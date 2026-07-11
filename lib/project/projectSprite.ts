/*
 * Project PriceSprite — the per-Project sprite face, collision-proofed
 * against USER sprites.
 *
 * A Project is treated like a user: it picks one of the 4 vibes at upload
 * (lib/sprites/vibes.ts) and gets a deterministic PriceSprite. Artists choose
 * the vibe; today's AI artists get a deterministic pick from the slug.
 *
 * ── No collision with user sprites (Brendon, 2026-06-16) ──────────────────
 * User sprites and Project sprites would otherwise share the SAME ~46M-face
 * pool (same composer, same SPRITE_DATA), so a Project could render identical
 * to a real user — at scale that's a meaningful chance, not a rare one. To make
 * it STRUCTURALLY impossible, every Project sprite uses a reserved bracket pair
 * (`PROJECT_BRACKET`) that is NOT in the user BRACKETS pool (lib/sprites/data.ts)
 * — so a Project face can never equal any user face, while arms/eyes/mouth/
 * trail/brow stay fully vibe-driven and unique per Project.
 *
 * Determinism: chainless sim has no contract address, so we seed from the slug
 * (a 40-hex stand-in for the wallet hash). Stable per slug; mirrors True Name /
 * Fate. The reserved-bracket rule carries straight into the on-chain version.
 */

import { resolveSprite, composeResolved } from '../sprites/composer';
import { PRICE_SPRITE_VIBES, type PriceSpriteVibe } from '../sprites/vibes';
import { hashString } from '../art/rng';
import { projectContractAddress } from './projectAddress';

/* Reserved Project-only bracket — tortoise-shell 〔 〕 (U+3014/3015). NOT one of
   the 11 user bracket pairs in lib/sprites/data.ts, so it can't collide; same
   CJK-bracket family as the user pool's 【】《》 so it still reads as a sprite. */
const PROJECT_BRACKET: readonly [string, string] = ['〔', '〕'];

/** The Project's PriceSprite vibe. Artists pick 1 of 4 at upload; AI Projects
    get a deterministic pick from the slug for now. */
export function projectVibe(slug: string): PriceSpriteVibe {
  return PRICE_SPRITE_VIBES[hashString(`vibe:${slug.toLowerCase()}`) % PRICE_SPRITE_VIBES.length];
}

/** The Project's still PriceSprite face string, collision-proofed vs users via
    the reserved bracket. Seeded from the Project's simulated contract address
    (the wallet stand-in), so it matches what the on-chain version will produce.
    Pure + deterministic — safe to call during render. */
export function projectSpriteFace(slug: string): string {
  return projectSpriteFaceFor(slug, projectVibe(slug));
}

/** Same face, but with an EXPLICIT vibe — the PD Studio path, where the
    artist picks 1 of 4 at upload (the design this file always promised).
    Reserved-bracket collision-proofing applies identically. */
export function projectSpriteFaceFor(slug: string, vibe: PriceSpriteVibe): string {
  const resolved = resolveSprite(projectContractAddress(slug), vibe);
  if (!resolved) return '';
  return composeResolved({ ...resolved, bracket: PROJECT_BRACKET }).fullString;
}

