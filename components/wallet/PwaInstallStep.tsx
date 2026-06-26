'use client';

/*
 * PwaInstallStep — signup Step 3: the "add PD to your home screen" prompt.
 *
 * OS-adaptive (lib/pwa/platform):
 *   iPhone / iPad  — Share → Add to Home Screen instruction (Apple has no API).
 *   Android        — fires Chrome's real native install dialog if offered;
 *                    falls back to the manual menu instruction otherwise.
 *   Desktop        — pivots to "get PD on your phone" with a scannable QR that
 *                    points at this exact origin (dev → dev, prod → prod).
 *
 * Funnel is recorded best-effort (recordPwa); the true conversion metric is the
 * standalone-launch stamp in PriceOSShell, independent of this screen.
 *
 * Renders INNER content only — the parent (AccountCreateModal) owns the modal
 * shell. onDone() finishes signup (parent calls onAccountCreated).
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { detectInstallOS, type InstallOS } from '@/lib/pwa/platform';
import { fireInstallPrompt } from '@/lib/pwa/installPrompt';
import { recordPwa } from '@/lib/state/userState';

const ShareGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V3" /><path d="M8 7l4-4 4 4" /><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
);
const DownGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V4" /><path d="M8 8l4-4 4 4" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </svg>
);

export function PwaInstallStep({ onDone }: { onDone: () => void }) {
    const [os] = useState<InstallOS>(() => detectInstallOS());
    const [qr, setQr] = useState<string | null>(null);
    const [emphasise, setEmphasise] = useState(false);
    const seenRef = useRef(false);
    /* Decorative notification badge on the app icon — sells that installing
       brings real, badged pings. Illustrative number (random 1–22), fixed for
       this mount so it doesn't flicker. */
    const [badgeNum] = useState(() => 1 + Math.floor(Math.random() * 22));

    /* Record that the prompt was shown (once). */
    useEffect(() => {
        if (seenRef.current) return;
        seenRef.current = true;
        recordPwa({ prompt_seen_at: new Date().toISOString() });
    }, []);

    /* Desktop QR — encode this exact origin (so dev shows dev, prod shows prod),
       with a proper quiet-zone margin for reliable phone scanning. */
    useEffect(() => {
        if (os !== 'desktop' || typeof window === 'undefined') return;
        QRCode.toDataURL(window.location.origin, {
            margin: 4,
            width: 360,
            color: { dark: '#111111', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        }).then(setQr).catch(() => setQr(null));
    }, [os]);

    const finish = (result: NonNullable<Parameters<typeof recordPwa>[0]>['prompt_result']) => {
        if (result) recordPwa({ prompt_result: result, prompt_result_at: new Date().toISOString() });
        onDone();
    };

    const onAndroidInstall = async () => {
        const outcome = await fireInstallPrompt();
        if (outcome === 'accepted') { finish('added'); return; }
        if (outcome === 'dismissed') { finish('declined'); return; }
        // Chrome didn't offer the native prompt — show the manual instruction.
        setEmphasise(true);
        recordPwa({ prompt_result: 'instructed', prompt_result_at: new Date().toISOString() });
    };

    /* Android shows a circular (adaptive) icon using the maskable art, which has
       the safe-zone padding so nothing important gets clipped by the circle.
       Every other platform keeps PD's iOS-style rounded square. */
    const isAndroid = os === 'android';
    const icon = (
        <div className="pwa-step-icon-wrap">
            <div className={`pwa-step-icon${isAndroid ? ' pwa-step-icon-android' : ''}`}>
                <img src={isAndroid ? '/icon-192-maskable.png' : '/icon-180px.png'} alt="PD" />
            </div>
            <span className="pwa-step-icon-badge" aria-hidden="true">{badgeNum}</span>
        </div>
    );

    if (os === 'desktop') {
        return (
            <div className="pwa-step pwa-step-desktop">
                {icon}
                <div className="pwa-step-copy">Get PD on your <u>phone</u></div>
                <div className="pwa-step-sub">PD&rsquo;s live notifications live on your phone. Scan to open it there and add it to your home screen.</div>
                <div className="pwa-step-qr-card">
                    {qr ? <img src={qr} alt="Scan to open PD on your phone" /> : <div className="pwa-step-qr-ph" />}
                </div>
                <div className="pwa-step-qr-cap">SCAN TO OPEN PD ON YOUR PHONE</div>
                <button type="button" className="pwa-step-btn" onClick={() => finish('instructed')}>CONTINUE TO PD</button>
                <button type="button" className="pwa-step-skip" onClick={() => finish('dismissed')}>Remind me on mobile</button>
            </div>
        );
    }

    const isApple = os === 'ios' || os === 'ipados';
    const hint = isApple
        ? (<>Tap <span className="pwa-step-hint-box"><ShareGlyph /></span> {os === 'ipados' ? 'in the toolbar, then' : 'Share, then'} <b>&nbsp;Add to Home Screen</b></>)
        : (emphasise
            ? (<>Open Chrome&rsquo;s <b>&nbsp;⋮ menu</b>, then <b>&nbsp;Install app</b></>)
            : <>One tap &mdash; Chrome will ask you to confirm.</>);

    const onPrimary = () => {
        if (isApple) { setEmphasise(true); recordPwa({ prompt_result: 'instructed', prompt_result_at: new Date().toISOString() }); }
        else void onAndroidInstall();
    };

    return (
        <div className="pwa-step">
            {icon}
            <div className="pwa-step-copy">PD is best experienced when <u>added to your home screen</u></div>
            <button type="button" className="pwa-step-btn" onClick={onPrimary}>
                <DownGlyph /> ADD TO HOME SCREEN
            </button>
            <div className={`pwa-step-hint${emphasise ? ' pwa-step-hint-pulse' : ''}`}>{hint}</div>
            <button type="button" className="pwa-step-skip" onClick={() => finish('dismissed')}>Maybe later</button>
        </div>
    );
}
