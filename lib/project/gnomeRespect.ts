/*
 * The Gnome's RESPECT — the keeper's ladder (Brendon, 2026-07-19 wow pass).
 *
 * The Favour (gnomeVoice.FAVOUR_DAYS) was the seed of this: hold a piece a
 * week, unlisted, and the keeper speaks for it. RESPECT generalises that
 * into the full relationship — five rungs, climbed with real ledger facts
 * only (pieces held in the project, total unbroken held-days, favoured
 * pieces). Nothing is bought, nothing is faked, nothing decays by whim:
 * respect is exactly what the ledger says you've earned with this one
 * gnome, per project.
 *
 * The ladder also drives the VOICE: which greeting pool the keeper draws
 * from when tapped (stranger / holder / favoured) now follows the rung.
 */

import { FAVOUR_DAYS } from './gnomeVoice';

export interface RespectFacts {
  /** Pieces of this project the wallet holds right now. */
  pieces: number;
  /** Sum of current unbroken held-days across those pieces. */
  totalHeldDays: number;
  /** How many pieces carry the Favour (held ≥ FAVOUR_DAYS, unlisted). */
  favoured: number;
}

export interface RespectRung {
  /** 0–4. */
  level: number;
  /** The rung's name, e.g. FRIEND OF THE HILL. */
  name: string;
  /** The honest requirement line for the NEXT rung (null at the top). */
  next: string | null;
}

const RUNG_NAMES = [
  'A STRANGER',
  'KNOWN AT THE DOOR',
  'FRIEND OF THE HILL',
  'FAVOURED',
  'KIN OF THE VEIN',
] as const;

export const RESPECT_TOP = RUNG_NAMES.length - 1;

/** Where the ladder puts this wallet, from ledger facts only. */
export function gnomeRespect(f: RespectFacts): RespectRung {
  let level = 0;
  if (f.pieces >= 1) level = 1;
  if (f.pieces >= 1 && f.totalHeldDays >= 21) level = 2;
  if (f.favoured >= 1) level = Math.max(level, 3);
  if (f.favoured >= 3 && f.totalHeldDays >= 60) level = 4;

  let next: string | null = null;
  if (level === 0) next = 'hold a piece of this project';
  else if (level === 1) next = `keep holding — ${Math.max(0, 21 - f.totalHeldDays)} more held-days to FRIEND OF THE HILL`;
  else if (level === 2) next = `earn the Favour — hold a piece ${FAVOUR_DAYS} days unbroken, unlisted`;
  else if (level === 3) {
    const needF = Math.max(0, 3 - f.favoured);
    const needD = Math.max(0, 60 - f.totalHeldDays);
    const parts: string[] = [];
    if (needF > 0) parts.push(`${needF} more favoured ${needF === 1 ? 'piece' : 'pieces'}`);
    if (needD > 0) parts.push(`${needD} more held-days`);
    next = `${parts.join(' and ')} to KIN OF THE VEIN`;
  }

  return { level, name: RUNG_NAMES[level], next };
}

/** Which greeting pool the rung unlocks (the voice follows the ladder). */
export function respectAudience(level: number): 'stranger' | 'holder' | 'favoured' {
  if (level >= 3) return 'favoured';
  if (level >= 1) return 'holder';
  return 'stranger';
}
