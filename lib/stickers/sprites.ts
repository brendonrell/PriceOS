/*
 * sprites — deterministic PriceSprite face strings for sticker use.
 *
 * Reuses the live sprite system: a seed string → a deterministic placeholder
 * address + vibe (the same hash scheme Projects use), composed into a face.
 * Real on-chain / DB sprites swap in here later; everything downstream just
 * consumes the string.
 */

import { resolveSprite, composeResolved } from '../sprites/composer';
import { projectContractAddress } from '../project/projectAddress';
import { projectVibe } from '../project/projectSprite';

/** Compose a sprite face from any seed (e.g. an @handle). */
export function spriteFaceFor(seed: string): string {
    const r = resolveSprite(projectContractAddress(seed), projectVibe(seed));
    return r ? composeResolved(r).fullString : '( · _ · )';
}
