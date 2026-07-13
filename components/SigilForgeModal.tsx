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

import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';
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
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const faction = useFaction();
    const forged = useSigilForged();
    const [striking, setStriking] = useState(false);

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
