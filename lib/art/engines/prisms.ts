/*
 * Prisms — public engine boundary (v3, Brendon 2026-06-12). The palette-
 * gradient engine in ./prismsCore replaces the v2 ring-encounter system
 * wholesale. Same Project identity (slug 'prisms', 256 Outputs, opus4-6);
 * one artist trait:
 *
 *   Palette — 100 named palettes, subtraited Main / Special (the PD
 *             subtrait feature). The names are an unnamed easter egg.
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

interface CalcData {
  aspectRatio: number;
  palette: { name: string };
}

function traitsFromCalc(data: CalcData): OutputTraits {
  return { Palette: data.palette.name };
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
  ],
};

export const PRISMS_ASPECTS: readonly number[] = PRISMS_RATIOS as number[];
