/*
 * Simulated Project contract address — the chainless stand-in for the address
 * each Project will get when it deploys on-chain (Brendon, 2026-06-16).
 *
 * Deterministic from the slug, formatted as a real 20-byte 0x address. It plays
 * the wallet's role for a Project-as-user: it seeds the PriceSprite (composer
 * takes a wallet hash) and fills the identity line where a user shows their
 * wallet/ENS. When Projects deploy on-chain this is swapped for the real
 * address — same shape, same call sites.
 */

import { hashString } from '../art/rng';

/** Deterministic simulated contract address for a Project (0x + 40 hex). */
export function projectContractAddress(slug: string): string {
  const s = slug.toLowerCase();
  let hex = '';
  for (let i = 0; i < 5; i++) {
    hex += hashString(`addr:${s}#${i}`).toString(16).padStart(8, '0');
  }
  return `0x${hex}`;
}

/** Short display form: 0x1234…abcd (mirrors the wallet truncation in the hero). */
export function shortAddress(addr: string): string {
  const h = addr.replace(/^0x/, '');
  return `0x${h.slice(0, 4)}…${h.slice(-4)}`;
}
