/*
 * collectionRoute — shared GET/PUT handlers for the per-user collection tables
 * (cart_items, bench_items). Both are owner-scoped: the SIWE session supplies
 * the address (requireAuth), and every query is keyed on it via the service-role
 * client (RLS bypass + ownership enforced in code, exactly like /api/me). The
 * client never sends an address, so a caller can only ever read/write their own
 * rows.
 *
 * PUT is a whole-collection replace: delete the user's rows, insert the new set.
 */

import { NextResponse } from 'next/server';
import { getSupabaseService } from '../supabase';
import { requireAuth } from '../auth/siwe';
import { badRequest, serverError } from '../errors';

type CollectionTable = 'cart_items' | 'bench_items';

/** GET → { items: [{ slug, id }] } for the authed user, oldest first. */
export function collectionGET(table: CollectionTable) {
    return requireAuth(async (_req, _ctx, address) => {
        try {
            const supabase = getSupabaseService();
            const { data, error } = await supabase
                .from(table)
                .select('project_id, token_id')
                .eq('user_address', address)
                .order('added_at', { ascending: true });
            if (error) return serverError(error.message);
            const list = (data ?? []) as { project_id: string; token_id: string }[];
            const items = list
                .map((r) => ({ slug: r.project_id, id: Number(r.token_id) }))
                .filter((it) => it.slug && Number.isFinite(it.id));
            return NextResponse.json({ items });
        } catch (err) {
            return serverError(err instanceof Error ? err.message : 'Unknown error');
        }
    });
}

/** PUT { items: [{ slug, id }] } → replace the authed user's whole collection. */
export function collectionPUT(table: CollectionTable, max: number) {
    return requireAuth(async (req, _ctx, address) => {
        let raw: unknown;
        try {
            raw = await req.json();
        } catch {
            return badRequest('Invalid JSON body');
        }
        const body = raw as { items?: unknown };
        if (!Array.isArray(body.items)) return badRequest('items must be an array');

        const seen = new Set<string>();
        const rows: { user_address: string; project_id: string; token_id: string }[] = [];
        for (const it of body.items) {
            if (rows.length >= max) break;
            const o = it as { slug?: unknown; id?: unknown };
            const slug = typeof o.slug === 'string' ? o.slug.slice(0, 64) : '';
            const id = typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : NaN;
            if (!slug || !Number.isFinite(id)) continue;
            const key = `${slug}:${id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({ user_address: address, project_id: slug, token_id: String(id) });
        }

        try {
            const supabase = getSupabaseService();
            const del = await supabase.from(table).delete().eq('user_address', address);
            if (del.error) return serverError(del.error.message);
            if (rows.length > 0) {
                const ins = await supabase.from(table).insert(rows as never);
                if (ins.error) return serverError(ins.error.message);
            }
            return NextResponse.json({ ok: true, count: rows.length });
        } catch (err) {
            return serverError(err instanceof Error ? err.message : 'Unknown error');
        }
    });
}
