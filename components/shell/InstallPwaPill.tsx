'use client';

/*
 * InstallPwaPill — the PWA install affordance (Brendon, 2026-06-12).
 *
 * Shows ONLY where a real install prompt exists: the browser fires
 * `beforeinstallprompt` (Android/Chrome installability checks passed), we
 * stash the event, and the pill tap replays it — the REAL install sheet
 * opens. No event, no pill: iOS Safari has no install API and gets
 * NOTHING (Brendon, 2026-06-12 — the Share→Add-to-Home-Screen hint pill
 * was unwanted and is gone). Already-installed (standalone) never shows.
 *
 * Dismissal persists (`pd_install_dismissed`) so it's a one-time offer per
 * device, not a nag. Install success also hides it.
 */

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pd_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return true;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari's pre-standard flag.
        (window.navigator as { standalone?: boolean }).standalone === true
    );
}

export default function InstallPwaPill() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isStandalone()) return;
        try {
            if (localStorage.getItem(DISMISS_KEY)) return;
        } catch {
            /* private mode — show; dismissal just won't stick */
        }
        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setVisible(true);
        };
        const onInstalled = () => setVisible(false);
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!visible) return null;

    const install = async () => {
        if (!deferred) return;
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') setVisible(false);
        setDeferred(null);
    };

    const dismiss = () => {
        setVisible(false);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="install-pwa-pill" role="complementary" aria-label="Install app">
            <button className="install-pwa-btn" onClick={install}>
                ⤓&#xFE0E; Install PD
            </button>
            <button
                className="install-pwa-dismiss"
                onClick={dismiss}
                aria-label="Dismiss install offer"
            >
                ✕&#xFE0E;
            </button>
        </div>
    );
}
