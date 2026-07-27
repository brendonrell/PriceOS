/*
 * The Conviction / Call Ledger — resolution law (2026-07-26).
 *
 * ONE pure function decides every call, so the cron sweep and the
 * resolve-on-read path can never disagree. The rules, exactly:
 *
 *   - A call is a claim about the project FLOOR (projects.floor_price_eth):
 *       floor_gte — "the floor reaches ≥ X before my deadline"  (bull)
 *       floor_lte — "the floor sits ≤ X before my deadline"     (bear)
 *   - CROSS SETTLES EARLY: the first floor reading that meets the target
 *     settles the call CROWNED immediately (inclusive boundary).
 *   - At the deadline, a target the floor never met is REKT.
 *   - A project with NO floor reading can never CROWN a call — at the
 *     deadline it's REKT (you claimed something the data never showed).
 *     Deterministic and the same for bulls and bears.
 */

export type CallClaim = 'floor_gte' | 'floor_lte';
export type CallStatus = 'open' | 'crowned' | 'rekt';

export interface OpenCall {
    claim_type: CallClaim;
    target_eth: number;
    window_end: string; // timestamptz ISO
}

export function claimMet(claim: CallClaim, targetEth: number, floorNow: number | null): boolean {
    if (floorNow == null || !(floorNow > 0)) return false;
    return claim === 'floor_gte' ? floorNow >= targetEth : floorNow <= targetEth;
}

/** 'crowned' | 'rekt' | null (still open). */
export function resolveCall(call: OpenCall, floorNow: number | null, nowMs: number): CallStatus | null {
    if (claimMet(call.claim_type, call.target_eth, floorNow)) return 'crowned';
    const end = Date.parse(call.window_end);
    if (Number.isFinite(end) && nowMs >= end) return 'rekt';
    return null;
}

/** The window picks — fixed, no free-form dates (v1). */
export const CALL_WINDOWS = [
    { key: '24H', ms: 24 * 3600_000 },
    { key: '7D', ms: 7 * 24 * 3600_000 },
    { key: '30D', ms: 30 * 24 * 3600_000 },
] as const;
export type CallWindowKey = (typeof CALL_WINDOWS)[number]['key'];
