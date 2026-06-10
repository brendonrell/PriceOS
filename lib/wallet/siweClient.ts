'use client';

/*
 * siweClient — client-side SIWE flow utilities.
 *
 * Replaces the previous lib/wallet/authAdapter.ts, which exported a
 * RainbowKit AuthenticationAdapter. That adapter's parent provider
 * (RainbowKitAuthenticationProvider) added a "Verify your account"
 * intermediate modal between the connect popup and the sign popup —
 * that intermediate tap was the worst link in the chain on mobile
 * Safari: broken gesture lineage, the wallet had time to bounce back
 * to Safari, the sign request landed cold, and the user often had to
 * retry 2-3 times for the signature to actually go through.
 *
 * New approach: drop RK's auth provider entirely. WalletProviders
 * watches wagmi's connection status and fires SIWE directly the
 * moment the wallet's session settles. The nonce is pre-fetched in
 * parallel with the connection approval, so by the time wagmi flips
 * to 'connected' we can build and sign the SIWE message instantly —
 * no server roundtrip mid-flow, no intermediate UI. On most wallets
 * the sign request reaches the wallet's WC session before it bounces
 * back to Safari, so the user sees popup 1 (connect) and popup 2
 * (sign) back-to-back without leaving the wallet UI.
 *
 * Exports:
 *   SIWE_EXPIRY_MINUTES     — nonce/message expiry window
 *   buildSiweMessage()      — assemble + prepare the EIP-4361 string
 *   fetchNonce()            — POST /api/auth/nonce → string
 *   verifySignature()       — POST /api/auth/siwe → address | null
 *   serverSignOut()         — DELETE /api/auth/siwe
 *   isIosBrowser()          — iOS UA detection
 *   wakeWalletForSignStep() — iOS Safari deep-link pre-fire
 *
 * The iOS wake hack is the same one shipped previously. Its gesture
 * lineage is weaker in the new flow (we fire it from a useEffect
 * triggered by wagmi's state change, not directly from a user tap
 * on a "Verify" button), but iOS Safari grants post-deep-link
 * returns a brief gesture credit window, so it's still worth firing.
 * Best-effort: when it works the wallet stays foregrounded and the
 * sign prompt appears in the same wallet session without a Safari
 * bounce; when it doesn't, WC's own redirect runs downstream and is
 * harmless if it skips.
 */

import { SiweMessage } from 'siwe';

export const SIWE_EXPIRY_MINUTES = 10;
const WC_DEEPLINK_CHOICE_KEY = 'WALLETCONNECT_DEEPLINK_CHOICE';

export interface BuildSiweMessageArgs {
    address: string;
    chainId: number;
    nonce: string;
}

export function buildSiweMessage({
    address,
    chainId,
    nonce,
}: BuildSiweMessageArgs): string {
    const issuedAt = new Date();
    const expirationTime = new Date(
        issuedAt.getTime() + SIWE_EXPIRY_MINUTES * 60 * 1000
    );
    return new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Price Discussion.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: issuedAt.toISOString(),
        expirationTime: expirationTime.toISOString(),
        resources: [window.location.origin],
    }).prepareMessage();
}

export async function fetchNonce(): Promise<string> {
    const r = await fetch('/api/auth/nonce', {
        method: 'POST',
        credentials: 'same-origin',
    });
    if (!r.ok) throw new Error('nonce fetch failed');
    const data = (await r.json()) as { nonce?: string };
    if (typeof data?.nonce !== 'string' || data.nonce.length === 0) {
        throw new Error('nonce response malformed');
    }
    return data.nonce;
}

export async function verifySignature(
    message: string,
    signature: string
): Promise<string | null> {
    const r = await fetch('/api/auth/siwe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { address?: string };
    return typeof data?.address === 'string'
        ? data.address.toLowerCase()
        : null;
}

/* serverSignOut moved to lib/wallet/siweSession.ts (perf batch
   2026-06-10) — it's a bare fetch with no siwe/ethers dependency, and
   the eager WalletProviders needs it without pulling this module's
   heavy import graph. Re-exported here so existing deferred-side
   imports keep working. */
export { serverSignOut } from './siweSession';

/* iOS Safari is the failure-mode platform for the WC deep-link
   hasFocus() skip. On Android, WC's redirect runs in user-gesture
   context reliably; on desktop there's no deep-link to fire.
   Scoping the workaround to iOS browsers avoids double-firing on
   platforms that don't need it. WebViews inside wallet apps
   (RainbowKit's injected path) don't have a stored deep-link choice
   so the workaround no-ops there anyway — the scope check is
   defence in depth. */
export function isIosBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    // iPadOS 13+ reports as Mac; touchpoint check disambiguates.
    const isIpadOs =
        ua.includes('Macintosh') &&
        typeof navigator.maxTouchPoints === 'number' &&
        navigator.maxTouchPoints > 1;
    return /iP(hone|ad|od)/.test(ua) || isIpadOs;
}

/* Read the wallet choice RainbowKit stashed when the user picked a
   wallet from the modal and open that URL. WC's getDeepLink helper
   (Oi() in @walletconnect/utils) reads the same key — we're using
   the same source of truth, just firing on our own initiative to
   sidestep the hasFocus() bail-out WC hits on iOS Safari mid-flow.
   Matches RK's own mobileUri strategy: anchor click + _blank for
   https universal links, direct navigation for native schemes
   (rainbow://, metamask://, etc.). */
export function wakeWalletForSignStep(): void {
    if (typeof window === 'undefined') return;
    let href: string | undefined;
    try {
        const raw = window.localStorage.getItem(WC_DEEPLINK_CHOICE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { href?: string };
        href = parsed?.href;
    } catch {
        return; // corrupted entry — let WC's own redirect try downstream.
    }
    if (typeof href !== 'string' || href.length === 0) return;

    if (href.startsWith('http')) {
        // Universal link — anchor click is what iOS Safari treats as
        // a user gesture for app handoff. `link.click()` inside a
        // synchronous handler keeps the gesture lineage intact.
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.click();
    } else {
        // Native scheme — direct navigation. Replaces the current
        // URL and asks iOS to hand off; Safari stays alive in the
        // background so the WC websocket can still resolve the
        // signature when the wallet responds.
        window.location.href = href;
    }
}
