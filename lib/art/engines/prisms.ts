/*
 * Prisms — public engine boundary (v2, Brendon 2026-06-11). The ring-
 * encounter system in ./prismsCore replaces the old gradient engine
 * wholesale. Same Project identity (slug 'prisms', 256 Outputs, opus4-6);
 * brand-new Artwork + trait taxonomy:
 *
 *   Palette   — 101 named palettes, subtraited Main / Special (the PD
 *               subtrait feature). The names are an unnamed easter egg.
 *   Mode      — STANDARD / VOID render mode.
 *   Encounter — NORMAL / SHARE DNA / BOSS.
 *   State     — the nine mutation states (NONE … TOTALINVERSION).
 *
 * prismsTraits runs calc() only (no canvas — server-safe); render() reads
 * the SAME calc() data it painted with, so the two can never disagree.
 */

import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';
import {
  PrismsEngine,
  PRISMS_PALETTE_NAMES,
  PRISMS_MAIN_PALETTES,
  PRISMS_RATIOS,
} from './prismsCore';

const MODES = ['STANDARD', 'VOID'] as const;
const ENCOUNTERS = ['NORMAL', 'SHARE DNA', 'BOSS'] as const;
const STATES = [
  'NONE', 'FLIPFLOPPER', 'PEOPLEPLEASER', 'SPELLCASTER', 'ACQUIESCENCE',
  'GROUPTHINK', 'RAGEBAIT', 'GHOSTED', 'TOTALINVERSION',
] as const;

const ENCOUNTER_LABEL: Record<string, string> = {
  standard: 'NORMAL',
  same_dna: 'SHARE DNA',
  boss: 'BOSS',
};

interface CalcData {
  aspectRatio: number;
  palette: { name: string };
  renderMode: string;
  mutation: string;
  encounterType: string;
}

function traitsFromCalc(data: CalcData): OutputTraits {
  return {
    Palette: data.palette.name,
    Mode: data.renderMode === 'void' ? 'VOID' : 'STANDARD',
    Encounter: ENCOUNTER_LABEL[data.encounterType] ?? 'NORMAL',
    State: data.mutation,
  };
}

export const renderPrisms: EngineFn = (canvas, tokenId, width) => {
  const engine = new PrismsEngine(tokenId);
  const data = engine.render(canvas, Math.max(1, Math.floor(width))) as CalcData;
  return { aspect: data.aspectRatio, traits: traitsFromCalc(data) };
};

export const prismsTraits: TraitsFn = (tokenId) => {
  const engine = new PrismsEngine(tokenId);
  return traitsFromCalc(engine.calc() as CalcData);
};

const specials = (PRISMS_PALETTE_NAMES as string[]).filter(
  (n) => !(PRISMS_MAIN_PALETTES as string[]).includes(n),
);

export const prismsSchema: TraitSchema = {
  traits: [
    {
      name: 'Palette',
      values: PRISMS_PALETTE_NAMES as string[],
      subtraits: [
        { name: 'Main', values: PRISMS_MAIN_PALETTES as string[] },
        { name: 'Special', values: specials },
      ],
    },
    { name: 'Mode', values: MODES },
    { name: 'Encounter', values: ENCOUNTERS },
    { name: 'State', values: STATES },
  ],
};

export const PRISMS_ASPECTS: readonly number[] = PRISMS_RATIOS as number[];
