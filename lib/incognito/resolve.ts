/*
 * Incognito Proxy — the pill-input resolver (2026-07-28, the brief's build).
 *
 * Turns what the user typed into a wallet address + display label:
 *   0x…            → as-is (label = shortened)
 *   name.eth       → forward-resolved on the same public ENS subgraph the
 *                    ensEngine already reads (reuse, never reinvent)
 *   @handle / name → /api/user/by-handle (the profile route)
 *
 * Pure fetch logic, no engine writes — the caller stores the result.
 */

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const HANDLE_RE = /^[a-z0-9_-]+$/;

export interface ProxyIdentity {
    address: string;
    label: string;
}

function short(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function resolveEns(name: string): Promise<string | null> {
    try {
        const query = `{ domains(where: { name: "${name}" }) { resolvedAddress { id } } }`;
        const r = await fetch('https://api.thegraph.com/subgraphs/name/ensdomains/ens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        const id = d?.data?.domains?.[0]?.resolvedAddress?.id;
        return typeof id === 'string' && ADDRESS_RE.test(id.toLowerCase()) ? id.toLowerCase() : null;
    } catch {
        return null;
    }
}

async function resolveHandle(handle: string): Promise<string | null> {
    try {
        const r = await fetch(`/api/user/by-handle/${encodeURIComponent(handle)}`, { cache: 'no-store' });
        if (!r.ok) return null;
        const d = await r.json();
        const addr = typeof d?.address === 'string' ? d.address.toLowerCase() : null;
        return addr && ADDRESS_RE.test(addr) ? addr : null;
    } catch {
        return null;
    }
}

/** Resolve the typed line to a proxy identity, or null (NOT FOUND). */
export async function resolveProxyInput(raw: string): Promise<ProxyIdentity | null> {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    if (ADDRESS_RE.test(q)) return { address: q, label: short(q) };
    if (q.endsWith('.eth')) {
        const addr = await resolveEns(q);
        return addr ? { address: addr, label: q } : null;
    }
    const handle = q.replace(/^@/, '');
    if (!HANDLE_RE.test(handle)) return null;
    const addr = await resolveHandle(handle);
    return addr ? { address: addr, label: `@${handle}` } : null;
}
