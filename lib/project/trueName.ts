/*
 * True Name — PD's per-Project secret-name glyph identity.
 *
 * Concept (Brendon): every Project is "spoken into being" by the community, so
 * at birth it receives a unique TRUE NAME — a short word in a script almost
 * nobody can read, the name that gives the Project its identity (the golem /
 * "true name" mythos; we use the Christian Glagolitic angle — Glagolitic
 * literally means "the word / to speak"). It is permanent and unique per
 * Project. Outputs are NOT named — they stay numbered editions.
 *
 * Script: GLAGOLITIC, uppercase only — the 47 uppercase letters U+2C00..U+2C2E.
 * A name is SLOTS=4 letters, so the space is 47^4 = 4,879,681 unique names —
 * ~2.7x the ~1.8M-Project ceiling over 100 years (≤3k artists × a 60-day
 * release throttle), so it never runs dry.
 *
 * Determinism: the name is cast from the Project's identity, exactly like Fate
 * (lib/project/fate.ts). On-chain the seed will be the Project's contract
 * ADDRESS (a contract can read its own address but not its creation tx hash);
 * in the chainless sim we seed from the bare slug via `hashString`. Because the
 * generator is deterministic, a Project's true name is stable forever from the
 * moment it is assigned — when projects deploy on-chain the SAME locked name is
 * carried into the contract (assigned, not re-derived), so nothing churns.
 *
 * Uniqueness: with ~70 Projects in a 4.88M space a natural collision is
 * astronomically unlikely (<0.001), but a true name is an identity + a search
 * key, so it MUST be unique. `assignTrueNames` resolves the rare clash by
 * deterministically nudging the seed (re-cast with an incrementing nonce) until
 * the name is free — the same collision-nudge the on-chain factory will use.
 */

import { mulberry32, hashString } from '../art/rng';

/** First uppercase Glagolitic letter (Ⰰ). The 47 letters run U+2C00..U+2C2E. */
const GLAGOLITIC_FIRST = 0x2c00;
/** Alphabet size — the 47 uppercase Glagolitic letters. */
export const ALPHABET_SIZE = 47;
/** Letters per name. 47^4 = 4,879,681 unique names. */
export const SLOTS = 4;
/** Total namespace — every distinct true name expressible. */
export const NAMESPACE = ALPHABET_SIZE ** SLOTS; // 4_879_681

/** Cast a 4-letter uppercase-Glagolitic true name from a numeric seed. */
export function trueNameFromSeed(seed: number): string {
  const r = mulberry32((seed >>> 0) || 1);
  let s = '';
  for (let i = 0; i < SLOTS; i++) {
    s += String.fromCodePoint(GLAGOLITIC_FIRST + Math.floor(r() * ALPHABET_SIZE));
  }
  return s;
}

/** Stable per-Project seed (chainless stand-in for the on-chain contract
    address). Seeds from the bare slug, distinct from Fate's `hashString(slug)`
    casting by a namespacing prefix so a Project's name and Fate never correlate. */
export function trueNameSeed(slug: string): number {
  return hashString(`truename:${slug}`);
}

/**
 * Assign a unique true name to every Project, in the given (stable) order.
 * Deterministic: each slug casts from `trueNameSeed`; on the rare collision the
 * seed is nudged (`truename:<slug>#<n>`) until the name is free. Returns a
 * slug → name map. Order only matters for the (practically never taken)
 * collision path, so names are effectively a pure function of the slug.
 */
export function assignTrueNames(slugs: readonly string[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const slug of slugs) {
    const key = slug.toLowerCase();
    let name = trueNameFromSeed(trueNameSeed(key));
    for (let nonce = 1; used.has(name); nonce++) {
      name = trueNameFromSeed(hashString(`truename:${key}#${nonce}`));
    }
    used.add(name);
    out.set(key, name);
  }
  return out;
}

/** Whether a string is composed only of uppercase Glagolitic letters (the
    valid true-name alphabet) — a cheap guard for the search resolver. */
export function isTrueNameGlyphs(s: string): boolean {
  if (!s) return false;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp < GLAGOLITIC_FIRST || cp >= GLAGOLITIC_FIRST + ALPHABET_SIZE) return false;
  }
  return true;
}
