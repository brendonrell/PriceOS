'use client';

/*
 * ThemeMusic — decides WHICH theme belongs to the page you're on, and keeps
 * the player pointed at it. Mounted once in the shell; renders nothing.
 *
 * The mapping (Brendon, 2026-07-31, after the audition rounds):
 *   /                     → Homepage AM / PM
 *   /art/[slug]/[localId] → Output Page          (an Output — browsing art)
 *   /art/[slug]           → Busy Mint while a mint is live, Sold Out once
 *                           it's gone, Output Page otherwise
 *   /artists              → Artist AM / PM
 *   /[slug]               → Profile
 * Anywhere not listed is SILENT on purpose — a theme is for the surfaces
 * Brendon named, not for every screen in the app.
 *
 * AM/PM splits on the viewer's own clock at noon, like every other displayed
 * time in PD (§9 — clock times are viewer-local, always).
 *
 * Off by default and only ever summoned by a long-press on the sound key
 * (Rule #-0.4). Two gates, both of which must be on: the sound layer itself
 * and the theme flag.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getAudioContext } from '../../lib/sound/engine';
import { readSoundOn } from '../../lib/sound/soundStore';
import { readThemeOn } from '../../lib/sound/themeStore';
import { startTheme, stopTheme, duckTheme } from '../../lib/sound/themePlayer';
import type { ThemeName } from '../../lib/sound/themes';
import { getFm, subscribeFm } from '../../lib/fm/fmBus';

/** Before noon in the viewer's own zone. */
function isMorning(): boolean {
    return new Date().getHours() < 12;
}

/** The project-page state, published by the project hero when it knows. */
type MintState = 'minting' | 'soldout' | null;
let mintState: MintState = null;

/** Called by the project page so the mint surfaces can pick their theme. */
export function setMintState(next: MintState): void {
    if (mintState === next) return;
    mintState = next;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pd:mint-state-changed'));
    }
}

function themeFor(pathname: string): ThemeName | null {
    if (pathname === '/') return isMorning() ? 'homeAm' : 'homePm';
    if (pathname.startsWith('/artists')) return isMorning() ? 'artistAm' : 'artistPm';

    if (pathname.startsWith('/art/')) {
        const rest = pathname.slice('/art/'.length).split('/').filter(Boolean);
        // /art/[slug]/[localId] and anything under it — a single Output.
        if (rest.length >= 2) return 'output';
        // /art/[slug] — the project. Its state picks the theme.
        if (mintState === 'minting') return 'busyMint';
        if (mintState === 'soldout') return 'soldOut';
        return 'output';
    }

    // Reserved app sections that are not a user profile.
    const APP_SECTIONS = [
        '/api', '/studio', '/deploy', '/dispatch', '/docs', '/marketplace',
        '/preview', '/offline', '/test', '/thumb-preview',
    ];
    if (APP_SECTIONS.some((p) => pathname.startsWith(p))) return null;

    // /[slug] and its tabs — a user profile.
    if (/^\/[^/]+(\/|$)/.test(pathname)) return 'profile';
    return null;
}

export default function ThemeMusic() {
    const pathname = usePathname();
    const want = useRef<ThemeName | null>(null);

    useEffect(() => {
        let cancelled = false;

        const apply = () => {
            if (cancelled) return;
            const on = readSoundOn() && readThemeOn();
            const next = on ? themeFor(pathname || '/') : null;
            want.current = next;
            if (!next) { stopTheme(); return; }
            const ac = getAudioContext();
            if (!ac) return;
            startTheme(next, ac);
            duckTheme(getFm().status === 'playing' || getFm().status === 'loading');
        };

        apply();

        /* Re-decide when: the flags flip, the miniplayer takes over or hands
           back, the project's mint state resolves, or the clock crosses noon
           while the page is open. */
        const onFm = () => {
            if (!want.current) return;
            duckTheme(getFm().status === 'playing' || getFm().status === 'loading');
        };
        const unsubFm = subscribeFm(onFm);
        window.addEventListener('pd:sound-changed', apply);
        window.addEventListener('pd:theme-changed', apply);
        window.addEventListener('pd:mint-state-changed', apply);
        const clock = window.setInterval(apply, 60_000);

        /* Leaving for another app stops the music — it must never play on into
           a locked screen or over whatever you switched to. Coming back starts
           the right theme again from the top. */
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') stopTheme();
            else apply();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelled = true;
            unsubFm();
            window.removeEventListener('pd:sound-changed', apply);
            window.removeEventListener('pd:theme-changed', apply);
            window.removeEventListener('pd:mint-state-changed', apply);
            document.removeEventListener('visibilitychange', onVisibility);
            window.clearInterval(clock);
            /* No stop here — this runs on every navigation, and a theme that
               carries across pages must not fade out and back in each time.
               startTheme() no-ops when the same piece is already playing. */
        };
    }, [pathname]);

    /* Mount-only: the one place that truly stops the music. */
    useEffect(() => stopTheme, []);

    return null;
}
