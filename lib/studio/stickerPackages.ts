/*
 * PD Studio — Sticker Packages (private layer; spec in ClickUp only).
 *
 * The machine-writable Package format both intake paths produce:
 *   - Claude path: any Claude model emits this JSON whole (SVGs + info),
 *     pasted/uploaded in one move.
 *   - Figma path: SVG file exports assemble into the same shape in the UI.
 *
 * Approval = a real signature from the connected (allowlisted) wallet over
 * the package hash. Approved packages persist here as the staging store;
 * catalog/on-chain wiring is the next phase.
 */

import { keccak256, stringToHex, type Hex } from 'viem';

export type PackageSticker = {
    name: string;
    /** Full SVG source, self-contained. */
    svg: string;
    tags?: string[];
};

export type StickerPackage = {
    name: string;
    stickers: PackageSticker[];
};

export type ApprovedPackage = StickerPackage & {
    id: string;
    hash: Hex;
    approvedBy: string;
    signature: Hex;
    approvedAt: number;
};

const STORE_KEY = 'pd-sticker-packages-v1';

export function packageHash(pkg: StickerPackage): Hex {
    return keccak256(stringToHex(JSON.stringify({ name: pkg.name, stickers: pkg.stickers })));
}

export function approvalMessage(pkg: StickerPackage): string {
    return `PD Sticker Package approval\npackage: ${pkg.name}\nstickers: ${pkg.stickers.length}\nhash: ${packageHash(pkg)}`;
}

/** Parse + validate a pasted/uploaded Package JSON. Throws with a plain reason. */
export function parsePackage(raw: string): StickerPackage {
    let obj: unknown;
    try {
        obj = JSON.parse(raw);
    } catch {
        throw new Error('Not valid JSON');
    }
    const p = obj as Partial<StickerPackage>;
    if (!p || typeof p.name !== 'string' || !p.name.trim()) throw new Error('Package needs a "name"');
    if (!Array.isArray(p.stickers) || p.stickers.length === 0) throw new Error('Package needs a "stickers" array');
    for (const s of p.stickers) {
        if (typeof s?.name !== 'string' || !s.name.trim()) throw new Error('Every sticker needs a "name"');
        if (typeof s?.svg !== 'string' || !s.svg.includes('<svg')) throw new Error(`Sticker "${s?.name ?? '?'}" is missing SVG source`);
    }
    return { name: p.name.trim(), stickers: p.stickers.map((s) => ({ name: s.name.trim(), svg: s.svg, tags: s.tags })) };
}

export function loadPackages(): ApprovedPackage[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        return Array.isArray(raw) ? (raw as ApprovedPackage[]) : [];
    } catch {
        return [];
    }
}

export function savePackage(pkg: ApprovedPackage): ApprovedPackage[] {
    const next = [pkg, ...loadPackages()];
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    return next;
}
