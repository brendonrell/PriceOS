'use client';

/*
 * PriceosModal
 *
 * Sim id #priceosModal (sim.html 5462–5477). The PriceOS *changelog*
 * dialog — distinct from PriceOS-the-shell. ASCII figlet logo header
 * (one of N rotates on each open) + version-list body.
 *
 * Triggered from the global footer "PriceOS 1.0" link
 * (sim 5338, openPriceosModal). Mounted globally in PriceOSShell so
 * any caller can fire useModal().open('priceos').
 *
 * Mock data only — port of a representative slice of sim's
 * PRICEOS_CHANGELOG (sim 7581) and a curated subset of PRICEOS_LOGOS
 * (sim 7470). Sim's full changelog is several hundred entries; we
 * carry the 10 most-recent v1.0.x bumps for the prototype.
 *
 * Logo rotation: pickLogo() runs on every open, deterministic random
 * pick from the curated set. Sim's _pickPriceosLogo() also applies a
 * scale() transform to fit narrow viewports — that's a CSS-port-time
 * concern (Build 4 scope = mock data only, no CSS port), so we render
 * the <pre> raw and let it overflow scroll if needed. Real fit math
 * lands in a follow-up polish pass.
 *
 * Hooks discipline: all hooks at the top, internals gate on isOpen.
 */

import {
    useCallback,
    useEffect,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useModal } from '../lib/state/ModalContext';

interface ChangelogEntry {
    v: string;
    date: string;
    items: string[];
}

/* Curated subset of sim's PRICEOS_LOGOS — the cleanest small/medium
   figlet renders that survive the React port without further escape
   gymnastics. Sim has ~30+ logos across common/middle/rare tiers; for
   the prototype 6 covers the "rotates on each open" feel. */
const LOGOS: string[] = [
    ' _____      _           ____   _____ \n|  __ \\    (_)         / __ \\ / ____|\n| |__) | __ _  ___ ___| |  | | (___  \n|  ___/ \'__| |/ __/ _ \\ |  | |\\___ \\ \n| |   | |  | | (_|  __/ |__| |____) |\n|_|   |_|  |_|\\___\\___|\\____/|_____/ ',
    '______     _           _____ _____ \n| ___ \\   (_)         |  _  /  ___|\n| |_/ / __ _  ___ ___ | | | \\ `--. \n|  __/ \'__| |/ __/ _ \\| | | |`--. \\\n| |  | |  | | (_|  __/\\ \\_/ /\\__/ /\n\\_|  |_|  |_|\\___\\___| \\___/\\____/ ',
    '                                 \n _____     _         _____ _____ \n|  _  |___|_|___ ___|     |   __|\n|   __|  _| |  _| -_|  |  |__   |\n|__|  |_| |_|___|___|_____|_____|',
    ' __        __  __ \n|__)_. _ _/  \\(_  \n|  | |(_(-\\__/__) ',
    '888b.      w            .d88b. .d88b. \n8  .8 8d8b w .d8b .d88b 8P  Y8 YPwww. \n8wwP\' 8P   8 8    8.dP\' 8b  d8     d8 \n8     8    8 `Y8P `Y88P `Y88P\' `Y88P\' ',
    'PPPP  RRRR  III  CCC  EEEEE  OOO   SSSS \nP   P R   R  I  C   C E     O   O S     \nPPPP  RRRR   I  C     EEEE  O   O  SSS  \nP     R  R   I  C   C E     O   O     S \nP     R   R III  CCC  EEEEE  OOO  SSSS  ',
];

/* 10 most-recent changelog entries from sim 7581, condensed for the
   prototype. Sim ports the full 100+-entry log when the
   live changelog wires to a repo / RSS feed. */
const CHANGELOG: ChangelogEntry[] = [
    {
        v: 'v1.0.46',
        date: 'APR 28 2026',
        items: [
            'Cart button relocated to far-left of the user-menu-wrapper.',
            'Add to Cart hover icon now only renders on listed tokens.',
        ],
    },
    {
        v: 'v1.0.45',
        date: 'APR 28 2026',
        items: [
            'Cart shipped — bulk-buy multiple tokens in one transaction.',
            'Setup Code nomenclature shortened (~22% shorter, brand-glyph versioning).',
        ],
    },
    {
        v: 'v1.0.44',
        date: 'APR 28 2026',
        items: [
            'Setup Code horizontal swipe-scroll fix on iOS (touch-action: pan-x).',
        ],
    },
    {
        v: 'v1.0.43',
        date: 'APR 28 2026',
        items: [
            'Collected By underline fix — single ::after stroke across PriceSprite + handle.',
        ],
    },
    {
        v: 'v1.0.42',
        date: 'APR 28 2026',
        items: [
            'PRISMS replaces STRATA as the placeholder collection — radial sectors.',
            'Modal pin nudge bumped +4 → +6px.',
        ],
    },
    {
        v: 'v1.0.41',
        date: 'APR 28 2026',
        items: [
            'Token modal anatomy refactor — Calc relocated, To Do added, Grail relocated, price restored, owner upgraded.',
        ],
    },
    {
        v: 'v1.0.40',
        date: 'APR 28 2026',
        items: [
            'NEW — The Calc ƒ. Slide-up bottom sheet, vs-floor delta + P&L ladder.',
        ],
    },
    {
        v: 'v1.0.39',
        date: 'APR 28 2026',
        items: [
            'Artist color persistence + migration (localStorage.pd_artist_color).',
            'Workspace default migration (_OLD_DEFAULT_CODES).',
        ],
    },
    {
        v: 'v1.0.38',
        date: 'APR 28 2026',
        items: [
            'Workspace switcher menu-close bug — root-caused + e.stopPropagation() fix.',
            'Artist custom default color → Attention Yellow (#FFE600).',
        ],
    },
    {
        v: 'v1.0.37',
        date: 'APR 28 2026',
        items: [
            'Workspace switcher visibility fix (var(--bg-color) for dot fill).',
            'Workspace switcher height fix (16px hit area, 4/6px dot).',
        ],
    },
];

function pickLogo(): string {
    return LOGOS[Math.floor(Math.random() * LOGOS.length)];
}

export default function PriceosModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'priceos';

    const [logo, setLogo] = useState<string>(LOGOS[0]);

    /* Re-pick logo on every open — sim's _pickPriceosLogo() runs in
       window.openPriceosModal at sim 7898. */
    useEffect(() => {
        if (isOpen) setLogo(pickLogo());
    }, [isOpen]);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    return (
        <div
            id="priceosModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={onBackdropClick}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        close();
                    }
                }}
                title="Close"
            >
                {'\u00D7'}
                {'\uFE0E'}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 720, width: '100%' }}
            >
                <div className="priceos-ascii-logo-wrap">
                    <pre
                        className="priceos-ascii-logo"
                        id="priceosAsciiLogo"
                        aria-hidden="true"
                    >
                        {logo}
                    </pre>
                </div>
                <div className="priceos-changelog-sep">
                    {'\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'}{' '}
                    CHANGELOG &middot; v1.0{' '}
                    {'\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'}
                </div>
                <div
                    className="collectors-list priceos-changelog-list"
                    id="priceosChangelogWrap"
                    style={{ maxHeight: 360, width: '100%' }}
                >
                    <div id="priceosChangelogList">
                        {CHANGELOG.map((entry) => (
                            <div
                                key={entry.v}
                                className="priceos-changelog-entry"
                            >
                                <div className="cl-version">
                                    <span>{entry.v}</span>
                                    <span className="cl-date">{entry.date}</span>
                                </div>
                                <ul>
                                    {entry.items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
