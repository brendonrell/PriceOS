'use client';

/*
 * PanopticonConfirmModal — the consent gate for the Panopticon spell.
 *
 * Panopticon is the opt-in surveillance trade: while on, the user broadcasts the
 * exact piece/page they're viewing to every other Panopticon-active user, and
 * sees theirs in return. Turning it ON is a deliberate act, so the pill routes
 * here first; only "Turn on" actually flips the flag. Turning it OFF is instant
 * and needs no modal. Mounted once in PriceOSShell.
 */

import { useModal } from '../lib/state/ModalContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useToast } from '../lib/state/ToastContext';

const VS15 = '︎';

export default function PanopticonConfirmModal() {
    const { openModal, close } = useModal();
    const { toggle } = usePdNotifs();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'panopticonConfirm';

    const turnOn = () => {
        toggle('spell_panopticon');
        showToast('Panopticon: ON');
        close();
    };

    return (
        <div
            className={`pan-backdrop${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Panopticon"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="pan-card" onClick={(e) => e.stopPropagation()}>
                <div className="pan-title">
                    <span className="pan-title-glyph">{`⎌${VS15}`}</span>
                    <span className="pan-title-text">PANOPTICON</span>
                </div>

                <p className="pan-lead">
                    Turn it on and anyone else running Panopticon sees what you&rsquo;re
                    looking at — <strong>down to the exact piece</strong> — the instant you
                    open it. In return, you see exactly what they&rsquo;re looking at, live.
                </p>

                <ul className="pan-points">
                    <li>Only people who also have it on can see you — and you, them.</li>
                    <li>You show up as <strong>your name</strong>, not an anonymous dot.</li>
                    <li>Switch it off and you vanish from the watch immediately.</li>
                </ul>

                <div className="pan-actions">
                    <button type="button" className="pan-btn pan-btn--ghost" onClick={close}>
                        Not now
                    </button>
                    <button type="button" className="pan-btn pan-btn--go" onClick={turnOn}>
                        Turn on Panopticon
                    </button>
                </div>
            </div>
        </div>
    );
}
