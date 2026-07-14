'use client';

/*
 * SigilForgeModal — THE FORGE. (Factions v3.1 §1 · task 86b9erfwp.)
 *
 * Opened from the last tile of the Profile Logo carousel. Shows the wallet's
 * one Sigil — the mark it was always going to have — and offers the single
 * irreversible act: forge it. Forging is set-once server-side (a tattoo);
 * once forged, the Sigil ring joins the carousel, the mark trails the @name,
 * and artwork stamps upgrade from the PriceSprite.
 *
 * Chrome is the .platform-modal shell (AboutPdModal pattern). The forge
 * button shows continuous motion while the hammer falls (house rule: never
 * a dead wait).
 */

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { useFaction } from '../lib/factions/useFaction';
import { useSigilForged, SIGIL_FORGED_EVENT } from '../lib/sigil/useSigilForged';
import SigilArt from './SigilArt';

const VS15 = '︎';

export default function SigilForgeModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'sigilForge';
    const { siweAddress, sigilHidden } = useAuth();
    const { showToast } = useToast();
    const faction = useFaction();
    const forged = useSigilForged();
    const [striking, setStriking] = useState(false);

    /* Show/hide the forged mark PLATFORM-WIDE (users.sigil_hidden). Hiding it
       removes the mark for every viewer — the owner's own pill AND everyone
       who visits their profile — not just the owner's view (Brendon,
       2026-07-14). The optimistic overlay flips the button the instant it's
       tapped; the account write + row refetch confirm, then the overlay clears
       once the server truth catches up. */
    const [pendingHidden, setPendingHidden] = useState<boolean | null>(null);
    const hidden = pendingHidden ?? sigilHidden;
    useEffect(() => {
        if (pendingHidden !== null && pendingHidden === sigilHidden) setPendingHidden(null);
    }, [sigilHidden, pendingHidden]);
    const toggleSigilVisibility = async () => {
        const next = !hidden;
        setPendingHidden(next);
        showToast('Sigil: ' + (next ? 'HIDDEN' : 'SHOWN'));
        try {
            const res = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ sigil_hidden: next }),
            });
            if (!res.ok) throw new Error(String(res.status));
            // Refetch the account row so the navbar pill reflects it live.
            try { window.dispatchEvent(new Event('pd:sigil-visibility-changed')); } catch { /* refetch is a nicety */ }
        } catch {
            setPendingHidden(null); // revert to the server truth
            showToast('Sigil: SAVE FAILED · try again');
        }
    };

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close],
    );

    const forge = async () => {
        if (striking || forged) return;
        setStriking(true);
        try {
            const res = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ forge_sigil: true }),
            });
            if (!res.ok) throw new Error(String(res.status));
            showToast('Sigil: FORGED');
            try {
                window.dispatchEvent(new Event(SIGIL_FORGED_EVENT));
            } catch { /* state still flips on next hydration */ }
        } catch {
            showToast('Forge: FAILED · try again');
        } finally {
            setStriking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            id="sigilForgeModal"
            className="platform-modal active"
            role="dialog"
            aria-modal="true"
            aria-label="The Forge"
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
                {'×'}
                {VS15}
            </div>
            <div className="modal-info sigil-forge" style={{ marginTop: 0, maxWidth: 460, width: '100%' }}>
                <div className="sf-title">THE SIGIL</div>

                {siweAddress ? (
                    <>
                        <div className={`sf-mark${striking ? ' is-striking' : ''}${forged ? ' is-forged' : ''}`}>
                            <SigilArt address={siweAddress} hex={forged ? faction?.hex : undefined} fill />
                        </div>

                        {forged ? (
                            <>
                                <p className="sf-line">FORGED. It cannot be unmade.</p>
                                <p className="sf-copy">
                                    Your mark now trails your @name, and your Sigil flies in
                                    every colour at the end of the Profile Logo carousel.
                                    Raise one and the colour knows whose side you&apos;re on.
                                </p>
                                <button
                                    type="button"
                                    className={`sf-toggle${hidden ? '' : ' is-on'}`}
                                    role="switch"
                                    aria-checked={!hidden}
                                    title={hidden ? 'Show your Sigil across PD' : 'Hide your Sigil across PD'}
                                    onClick={() => void toggleSigilVisibility()}
                                >
                                    {hidden ? 'HIDDEN ACROSS PD' : 'SHOWN ACROSS PD'}
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="sf-copy">
                                    Every wallet carries one mark, written into it before you
                                    ever arrived. This is yours. It has never belonged to
                                    anyone else and never will.
                                </p>
                                <p className="sf-copy">
                                    Forge it and it is yours forever — beside your name, in
                                    the margins of everything you touch. There is no unmaking
                                    a Sigil. The stone remembers.
                                </p>
                                <div
                                    className={`sf-forge-btn${striking ? ' is-striking' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled={striking}
                                    onClick={() => void forge()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            void forge();
                                        }
                                    }}
                                >
                                    {striking ? 'FORGING…' : 'FORGE IT — FOREVER'}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <p className="sf-copy">Sign in to see the mark your wallet carries.</p>
                )}
            </div>
        </div>
    );
}
