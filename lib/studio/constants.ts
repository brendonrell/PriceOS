/*
 * PD Studio — chain constants (Sepolia-first, per docs/pd-studio-spec.md).
 * Same deployed Sepolia stack as /test (docs/sepolia-test-phase.md §0.5).
 * At mainnet cutover these move to the mainnet addresses.
 */

import type { Address } from 'viem';

export const STUDIO_FACTORY: Address = '0xbebf82fe12f2d85780ca4835796885208f7d0367';
export const STUDIO_REGISTRY: Address = '0x303cabf0fe2483f159718d93e5e5224c59a1c673';

/* Protocol bounds enforced by PDFactory.createProject. */
export const SUPPLY_MIN = 22;
export const SUPPLY_MAX = 9_999;
