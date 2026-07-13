// lib/factions/oath.ts — server-only. The oath ledger writer.
//
// Called fire-and-forget from PATCH /api/me whenever a profile_logo write
// lands. The rules (spec §2, open call #5 rec):
//   - Picking a faction colour for the FIRST time = enlisting (sworn_at now).
//   - Re-picking your own colour = nothing (the flag already flies).
//   - Picking a NEUTRAL logo (solid / Petey / $PRICE / holo / off) = nothing.
//     The flag flies until you raise another; time keeps accruing.
//   - Picking a DIFFERENT faction colour = DEFECTION: accrued time resets
//     (sworn_at now), 30d cooldown before the new flag counts (enforced in
//     the grip formula off sworn_at + defected_at), scar permanent.
//
// Best-effort: an oath write must never throw into the settings save it rides.

import type { getSupabaseService } from '@/lib/supabase';
import { factionForLogo } from './factions';

type DB = ReturnType<typeof getSupabaseService>;

export async function recordOath(db: DB, address: string, newLogoId: string | null): Promise<void> {
    try {
        const faction = factionForLogo(newLogoId);
        if (!faction) return; // neutral logo — the last flag stands

        const addr = address.toLowerCase();
        const { data } = await db
            .from('faction_oaths')
            .select('faction, defections')
            .eq('address', addr)
            .maybeSingle();
        const cur = data as { faction: string; defections: number } | null;

        if (!cur) {
            await db.from('faction_oaths').insert({
                address: addr,
                faction: faction.key,
                sworn_at: new Date().toISOString(),
            } as never);
            return;
        }
        if (cur.faction === faction.key) return;

        // Defection — the oath binds; bandwagoning forfeits everything.
        await db
            .from('faction_oaths')
            .update({
                faction: faction.key,
                sworn_at: new Date().toISOString(),
                prev_faction: cur.faction,
                defected_at: new Date().toISOString(),
                defections: (cur.defections ?? 0) + 1,
                updated_at: new Date().toISOString(),
            } as never)
            .eq('address', addr);
    } catch (err) {
        console.error('[factions] recordOath error:', err instanceof Error ? err.message : err);
    }
}
