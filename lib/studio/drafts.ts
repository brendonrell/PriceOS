/*
 * PD Studio — draft Projects + test runs. v1 store is localStorage (drafts
 * are private to the device/wallet that made them); the Supabase-backed
 * cross-device store is the next phase (docs/pd-studio-spec.md).
 *
 * Test-run hashes are KEPT (the docs promise reproducibility: any simulated
 * Output can be re-rendered exactly after a script revision). Scripts render
 * from hashes, so runs store hashes only — never rendered pixels.
 */

import { encodePacked, keccak256, type Address, type Hex } from 'viem';

export type StudioRun = {
    id: string;
    at: number;
    /** Simulated minter used for this run's hash derivation. */
    minter: Address;
    /** Simulated per-run entropy (stands in for blockhash+prevrandao). */
    entropy: Hex;
    /** One tokenHash per simulated Output, index 0 = tokenId 1. */
    hashes: Hex[];
};

export type StudioDraft = {
    id: string;
    name: string;
    symbol: string;
    supply: number;
    /** Mint price in ETH, kept as the raw input string ("0.00022"). */
    priceEth: string;
    script: string;
    createdAt: number;
    updatedAt: number;
    runs: StudioRun[];
    /** Set once the draft has gone on-chain via /studio/publish. */
    deployed?: { project: Address; splitter: Address; tx: string; at: number };
};

const STORE_KEY = 'pd-studio-drafts-v1';
/** Kept runs per draft — hashes are cheap but not free; the newest N stay. */
const MAX_RUNS = 20;

function randomHex32(): Hex {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return `0x${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}` as Hex;
}

export function loadDrafts(): StudioDraft[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        return Array.isArray(raw) ? (raw as StudioDraft[]) : [];
    } catch {
        return [];
    }
}

export function saveDrafts(drafts: StudioDraft[]): void {
    localStorage.setItem(STORE_KEY, JSON.stringify(drafts));
}

export function newDraft(): StudioDraft {
    const now = Date.now();
    return {
        id: `d${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
        name: '',
        symbol: '',
        supply: 222,
        priceEth: '0.00022',
        script: '',
        createdAt: now,
        updatedAt: now,
        runs: [],
    };
}

/*
 * Token hashes, derived the way PDProject.mint derives them (PDProject.sol):
 *   entropy   = keccak256(blockhash(n-1) ++ prevrandao)   — simulated here
 *   tokenHash = keccak256(abi.encodePacked(uint256 tokenId, bytes32 entropy,
 *               address minter))
 * The simulation replaces the two block fields with strong randomness (they
 * are entropy, that is their whole job) and draws a random minter per run —
 * the derivation SHAPE is the contract's, byte for byte.
 */
export function simulateRun(count: number): StudioRun {
    const entropySeed = randomHex32();
    const prevrandao = randomHex32();
    const entropy = keccak256(encodePacked(['bytes32', 'bytes32'], [entropySeed, prevrandao]));
    const minter = (`0x${randomHex32().slice(2, 42)}`) as Address;
    const hashes: Hex[] = [];
    for (let tokenId = 1; tokenId <= count; tokenId++) {
        hashes.push(
            keccak256(
                encodePacked(['uint256', 'bytes32', 'address'], [BigInt(tokenId), entropy, minter])
            )
        );
    }
    return {
        id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
        at: Date.now(),
        minter,
        entropy,
        hashes,
    };
}

export function addRun(draft: StudioDraft, run: StudioRun): StudioDraft {
    return {
        ...draft,
        updatedAt: Date.now(),
        runs: [run, ...draft.runs].slice(0, MAX_RUNS),
    };
}

/*
 * The self-contained artwork page — the EXACT envelope PDProject's
 * _animationField builds for tokenURI (vanilla / no-library form; the
 * library block joins when registry-bound testing lands). What renders in a
 * Studio test run is what a collector's mint will serve.
 */
export function buildEnvelope(script: string, hash: Hex, tokenId: number): string {
    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>html,body{margin:0;padding:0;background:#0a0a0a;overflow:hidden;}canvas{display:block;}</style>' +
        `</head><body><script>var tokenData={hash:"${hash}",tokenId:"${tokenId}"};</scr` +
        `ipt><script>${script.replace(/<\/script>/gi, '<\\/script>')}</scr` +
        'ipt></body></html>'
    );
}
