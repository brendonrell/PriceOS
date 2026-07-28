'use client';

/*
 * KeychainCharmModal — one charm, big (the profile mini-charm's tap).
 * Payload: `${address}` (their equipped charm) or `${address}:${id}`.
 * A popup over wherever you are — never a nav (the ping/tag-popup law).
 */

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../../lib/state/ModalContext';
import { charmSVG, charmTraits, chainTier, FINISH_NAMES, finishForRank } from '../../lib/keychains/engine';
import { useKeychainRack } from '../../lib/keychains/rack';

const VS15 = '︎';

export default function KeychainCharmModal() {
    const { close, openModal } = useModal();
    const { isOpen, isTop, isTopStacked } = useModalLayer('keychain');

    const payload = isTop && typeof openModal?.payload === 'string' ? openModal.payload : '';
    const [address, idPart] = payload.split(':');
    const rack = useKeychainRack(isOpen && address ? address : null);

    const charm = useMemo(() => {
        if (!rack) return null;
        const id = idPart ? Number(idPart) : rack.equipped;
        if (id == null) return null;
        return rack.charms.find((c) => c.id === id) ?? null;
    }, [rack, idPart]);

    const svg = useMemo(
        () => (charm && rack ? charmSVG(charm.seed, `kc${charm.id}`, rack.streak, rack.rank, charm.name, charm.coin) : ''),
        [charm, rack],
    );

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="dp-charm-pop-backdrop"
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Keychain"
            onClick={close}
        >
            <div className="dp-charm-pop" onClick={(e) => e.stopPropagation()}>
                <span
                    className="ambient-pop-close"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                >
                    {`×${VS15}`}
                </span>
                {!charm || !rack ? (
                    <p className="dp-note">{rack ? 'No charm equipped.' : 'Loading…'}</p>
                ) : (
                    <>
                        <span className="dp-charm-big" dangerouslySetInnerHTML={{ __html: svg }} />
                        <div className="dp-sheet">
                            {charm.name && <div className="dp-sheet-name">{charm.name}</div>}
                            <div className="dp-charm-life">
                                <span>{`⚷${VS15}`} {chainTier(rack.streak).label}</span>
                                <span>{FINISH_NAMES[finishForRank(rack.rank)]}</span>
                            </div>
                            <div className="dp-traits">
                                {charmTraits(charm.seed, rack.streak, rack.rank, charm.coin).map((t) => (
                                    <span key={t.k} className="dp-trait">
                                        <span className="dp-trait-k">{t.k.toUpperCase()}</span>
                                        <span className="dp-trait-v">{t.v}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
