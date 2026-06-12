'use client';

/*
 * InstallPwaPill — the PWA install affordance (Brendon, 2026-06-12).
 *
 * Browsers rarely volunteer their install UI, so the app offers its own:
 * a small fixed pill above the footer. Behaviour by platform:
 *   - Android/Chrome: the browser fires `beforeinstallprompt`; we stash the
 *     event and the pill tap replays it — the REAL install sheet opens.
 *     The pill only appears once the event has fired (i.e. the manifest +
 *     service worker passed Chrome's installability checks).
 *   - iOS Safari: no install event. The pill shows on iOS when not
 *     installed; tapping it explains the Share → "Add to Home Screen" path
 *     (that's the only way Apple allows).
 *   - Already installed (standalone display-mode): never shows.
 *
 * Dismissal persists (`pd_install_dismissed`) so it's a one-time offer per
 * device, not a nag. Install success also hides it.
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';

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

function isIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) ||
        // iPadOS 13+ masquerades as macOS but is touch-first.
        (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

export default function InstallPwaPill() {
    const { showToast } = useToast();
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        if (isStandalone()) return;
        try {
            if (localStorage.getItem(DISMISS_KEY)) return;
        } catch {
            /* private mode — show; dismissal just won't stick */
        }
        if (isIos()) {
            setIos(true);
            setVisible(true);
            return;
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
        if (ios) {
            showToast('INSTALL: Share ⇧ → "Add to Home Screen"');
            return;
        }
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
