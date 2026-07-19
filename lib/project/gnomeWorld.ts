/*
 * The Gnome World — the fake-pfp layer around the Project Gnomes (Brendon,
 * 2026-07-19): gnomes are PD's inside-joke NFT collection. A gnome sleeps in
 * the hill until an unknown amount of the project is minted; the wallet whose
 * mint strikes the waking hour OWNS the gnome, and owning your first one
 * unlocks the GNOMEWALLET — a themed other-world wallet with its own
 * 6n0m3… address system and .gnome names. Gnomenclature throughout.
 *
 * This file is the client-safe identity kit: the gnome-address derivation,
 * the .gnome name, the tagline, and the rarity ladder. The waking threshold
 * itself is deliberately NOT here — it lives server-side only (the route),
 * so the "unknown amount" stays unknown.
 */

import { mulberry32, hashString } from '../art/rng';

/** The gnomewallet's word. Locked (Brendon, 2026-07-19). */
export const GNOME_TAGLINE = 'GNOME MATTER WHAT';

/** Placeholder gnome mark (pending Brendon's pick from the 20-option round +
    the #1 device gate). VS-15 appended at render like every PD glyph. */
export const GNOME_GLYPH = '☖';

/* ── The 6n0m3 address system ─────────────────────────────────────────────────
   Every real wallet casts exactly one gnome-wallet address: same 42-char
   shape as an Ethereum address, but the chain is the hill — it starts with
   `6n0m3` and the rest is hex dug deterministically from the real address.
   Pure display-layer fiction: nothing signs with it, nothing ever will. */

export function gnomeAddress(realAddress: string): string {
  const key = realAddress.toLowerCase();
  const r = mulberry32(hashString(`6n0m3:${key}`) || 1);
  let hex = '';
  while (hex.length < 37) {
    hex += Math.floor(r() * 16).toString(16);
  }
  return `6n0m3${hex}`;
}

/** `6n0m3…ab12` — the short form, same shape as the app's 0x1234…abcd. */
export function shortGnomeAddress(realAddress: string): string {
  const g = gnomeAddress(realAddress);
  return `${g.slice(0, 5)}…${g.slice(-4)}`;
}

/** The fake ENS of the gnome world: brendon.gnome. Handle in, name out. */
export function gnomeEns(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return `${handle.replace(/^@/, '')}.gnome`;
}

/* ── Rarity — cast at the waking hour ─────────────────────────────────────────
   Rarer gnomes come out of busier veins: the tier is read from the project's
   real traded volume (ETH) at the moment the gnome wakes, and stored on the
   awakening record — locked forever, like everything else about a gnome. */

export const GNOME_RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY', 'MYTHIC'] as const;
export type GnomeRarity = (typeof GNOME_RARITIES)[number];

export function gnomeRarityForVolume(volumeEth: number): GnomeRarity {
  if (volumeEth >= 20) return 'MYTHIC';
  if (volumeEth >= 5) return 'LEGENDARY';
  if (volumeEth >= 1) return 'RARE';
  if (volumeEth >= 0.2) return 'UNCOMMON';
  return 'COMMON';
}

/** Ownership state of one awakened gnome, as the API tells it. */
export interface GnomeAwakening {
  project_id: string;
  awakened_at: string;
  /** The real wallet that struck the waking hour (its mint crossed the
      hidden threshold). The gnome lives in that wallet's gnomewallet. */
  owner_address: string;
  owner_handle: string | null;
  /** The piece whose mint woke the gnome. */
  token_id: number;
  rarity: GnomeRarity;
}
