/*
 * vaultStore — THE VAULT v2 (Brendon, 2026-07-27).
 *
 * "A simple place you designate artworks as vaulted. We can literally make it
 * albums but only for pieces you own — vault 1, vault 2, just like albums."
 * So this IS albumStore's shape and mechanics, verbatim (Rule #0): numbered,
 * ordered groups of Output keys, no names, no cap. The ONE difference is the
 * membership rule — only pieces the owner actually holds get vaulted, and
 * that's enforced at the add door (the panel only offers your holdings).
 *
 * PUBLIC, unlike albums: a profile's vaults are its grail walls, served to
 * every visitor by /api/vaults/[address] (which lifts only this key out of
 * the private settings envelope).
 *
 * Persistence: localStorage `pd_vaults`, account write-through via the
 * settings envelope (pushSettings) — vaults follow the owner across devices.
 */

import type { AlbumRecord } from '../supabase';
import {
    pushSettings,
    STATE_CACHE_KEYS,
    USERSTATE_HYDRATED_EVENT,
} from '../state/userState';

/** A vault is the album record shape, on purpose — see the header. */
export type VaultRecord = AlbumRecord;

const STORAGE_KEY = STATE_CACHE_KEYS.vaults;

type Listener = (vaults: ReadonlyArray<VaultRecord>) => void;

let vaults: VaultRecord[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

export function sanitizeVaults(parsed: unknown): VaultRecord[] {
    if (!Array.isArray(parsed)) return [];
    const out: VaultRecord[] = [];
    for (const a of parsed) {
        if (!a || typeof a !== 'object') continue;
        const r = a as Partial<VaultRecord>;
        if (typeof r.id !== 'string') continue;
        out.push({
            id: r.id,
            name: typeof r.name === 'string' ? r.name : '',
            keys: Array.isArray(r.keys)
                ? r.keys.filter((k): k is string => typeof k === 'string' && k.includes(':'))
                : [],
            created_at: typeof r.created_at === 'number' ? r.created_at : 0,
            ...(typeof r.cover === 'string' && r.cover.includes(':') ? { cover: r.cover } : {}),
        });
    }
    return out;
}

function loadFromCache(): VaultRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return sanitizeVaults(JSON.parse(raw));
    } catch {
        return [];
    }
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    vaults = loadFromCache();
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vaults));
        } catch {
            /* ignore */
        }
    }
    pushSettings({ vaults: vaults.map((v) => ({ ...v, keys: [...v.keys] })) });
}

function emit(): void {
    const snapshot: ReadonlyArray<VaultRecord> = vaults.map((v) => ({
        ...v,
        keys: [...v.keys],
    }));
    listeners.forEach((l) => l(snapshot));
}

if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        vaults = loadFromCache();
        emit();
    });
}

/** Snapshot of the viewer's vaults, insertion-ordered. Triggers hydrate. */
export function getVaults(): ReadonlyArray<VaultRecord> {
    hydrate();
    return vaults.map((v) => ({ ...v, keys: [...v.keys] }));
}

/** Create a vault. Numbered by position, never named — same as albums. */
export function createVault(): VaultRecord {
    hydrate();
    const record: VaultRecord = {
        id: `vlt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: '',
        keys: [],
        created_at: Date.now(),
    };
    vaults.push(record);
    persist();
    emit();
    return { ...record, keys: [...record.keys] };
}

/** Add pieces to a vault (de-duped, insertion-ordered). The caller passes
 *  ONLY owned pieces — the panel's add door offers holdings and nothing else. */
export function addToVault(
    vaultId: string,
    items: ReadonlyArray<{ slug: string; id: number }>,
): number | null {
    hydrate();
    const vault = vaults.find((v) => v.id === vaultId);
    if (!vault) return null;
    const have = new Set(vault.keys);
    let added = 0;
    for (const it of items) {
        const k = keyOf(it.slug, it.id);
        if (have.has(k)) continue;
        have.add(k);
        vault.keys.push(k);
        added++;
    }
    if (added > 0) {
        persist();
        emit();
    }
    return added;
}

/** Remove pieces from a vault. Clears the cover if it was removed. */
export function removeFromVault(vaultId: string, keys: ReadonlyArray<string>): number | null {
    hydrate();
    const vault = vaults.find((v) => v.id === vaultId);
    if (!vault) return null;
    const drop = new Set(keys);
    const before = vault.keys.length;
    vault.keys = vault.keys.filter((k) => !drop.has(k));
    if (vault.cover && drop.has(vault.cover)) delete vault.cover;
    const removed = before - vault.keys.length;
    if (removed > 0) {
        persist();
        emit();
    }
    return removed;
}

/** Delete a vault outright. Later vaults renumber implicitly (position). */
export function deleteVault(vaultId: string): boolean {
    hydrate();
    const before = vaults.length;
    vaults = vaults.filter((v) => v.id !== vaultId);
    if (vaults.length === before) return false;
    persist();
    emit();
    return true;
}

/** Set (or clear, with null) a vault's cover. The key must be a member. */
export function setVaultCover(vaultId: string, key: string | null): boolean {
    hydrate();
    const vault = vaults.find((v) => v.id === vaultId);
    if (!vault) return false;
    if (key === null) delete vault.cover;
    else if (vault.keys.includes(key)) vault.cover = key;
    else return false;
    persist();
    emit();
    return true;
}

/** Move member keys to the FRONT of a vault, preserving their order. */
export function moveToVaultFront(vaultId: string, keys: ReadonlyArray<string>): boolean {
    hydrate();
    const vault = vaults.find((v) => v.id === vaultId);
    if (!vault) return false;
    const pick = new Set(keys);
    const front = vault.keys.filter((k) => pick.has(k));
    if (front.length === 0) return false;
    vault.keys = [...front, ...vault.keys.filter((k) => !pick.has(k))];
    persist();
    emit();
    return true;
}

/** Subscribe to vault changes. Returns an unsubscribe function. */
export function subscribeVaults(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
