'use client';

/*
 * PriceSpriteModal
 *
 * Sim id #priceSpriteModal — sim.html 4292–4358. Opened from clicking
 * the asciiSpriteWrap or asciiPfpBadge inside the user-menu-wrapper
 * (sim 4449, 4452). Mirrors the Familiar modal visual language
 * (platform-modal, close-hint, modal-info).
 *
 * Sim refs:
 *   markup ........... sim.html 4292–4358
 *   open/close ....... sim.html 12975–13026
 *   hero sync ........ sim.html 12966–12973 (_syncHeroSprite)
 *
 * Surfaces deferred:
 *   - Animated hero sprite — sim hooks a MutationObserver to mirror
 *     the connect-menu sprite's frame state (blink/turn/yawn/sleep).
 *     The PDFamiliar IIFE that drives those frames isn't ported yet,
 *     so the hero shows the static default frame for now. When the
 *     sprite engine lands the observer wiring follows the same pattern.
 *   - Identity Plate Export → placeholder toast.
 *   - Live XP / Level — hard-coded to 42 / 680/1000 + the six metric
 *     mocks from sim. Real wiring goes through user-stats indexer.
 *
 * Hooks discipline: every hook before any conditional return; the
 * component renders the modal element on every render and gates
 * internals on `isOpen`.
 */

import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';

const VS15 = '\uFE0E';

interface ScoreRow {
    label: string;
    value: string;
    pts: string;
}

/* Mock score breakdown — sim.html 4319–4348 verbatim. Six rows that
   compose the LEVEL display from contributing activity metrics. */
const SCORE_ROWS: readonly ScoreRow[] = [
    { label: 'Primary Mints',    value: '17',   pts: '+170 pts' },
    { label: 'Secondary Buys',   value: '34',   pts: '+170 pts' },
    { label: 'Volume \u00B7 ETH', value: '4.22', pts: '+84 pts'  },
    { label: 'Breadcrumbs',      value: '128',  pts: '+64 pts'  },
    { label: 'Artists Followed', value: '92',   pts: '+92 pts'  },
    { label: 'Days Active',      value: '222',  pts: '+100 pts' },
];

export default function PriceSpriteModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'priceSprite';

    return (
        <div
            id="priceSpriteModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) close();
            }}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    close();
                }}
                title="Close"
            >
                {`\u00D7${VS15}`}
            </div>

            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 440, width: '100%' }}
            >
                <div className="modal-title" style={{ marginBottom: 6 }}>
                    PRICESPRITE
                </div>

                {/* Hero sprite — static for now. Live MutationObserver wiring lands
                    when the PDFamiliar engine ports (sim 12988–12995). */}
                <div className="ps-hero" aria-hidden="true">
                    <span className="ps-hero-sprite" id="priceSpriteHeroSprite">
                        (ง •̀_•́)ง
                    </span>
                </div>

                {/* Level — composed dingbats matching the ❹❷ badge by the connect menu. */}
                <div className="ps-level-row">
                    <div className="ps-level-label">LEVEL</div>
                    <div className="ps-level-value">{'\u2779\u2777'}</div>
                </div>

                {/* Progress bar to next level — placeholder 68%. */}
                <div className="ps-next-wrap">
                    <div className="ps-next-bar">
                        <div
                            className="ps-next-fill"
                            style={{ width: '68%' }}
                        />
                    </div>
                    <div className="ps-next-labels">
                        <span>lvl 42 · 680 / 1000 XP</span>
                        <span>lvl 43 →</span>
                    </div>
                </div>

                <div className="ps-section-header">SCORE BREAKDOWN</div>
                <div className="ps-metrics">
                    {SCORE_ROWS.map((row) => (
                        <div className="ps-metric" key={row.label}>
                            <div className="ps-metric-label">{row.label}</div>
                            <div className="ps-metric-val">{row.value}</div>
                            <div className="ps-metric-pts">{row.pts}</div>
                        </div>
                    ))}
                </div>

                {/* Identity Plate Export — placeholder toast, sim 4353. */}
                <div className="ps-action-row">
                    <button
                        className="ps-action-btn"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            showToast('Identity Plate Export — coming soon');
                        }}
                    >
                        <span className="ps-action-icon">{`\u2348${VS15}`}</span>{' '}
                        EXPORT IDENTITY PLATE
                    </button>
                </div>
            </div>
        </div>
    );
}
