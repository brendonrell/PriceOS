'use client';

/*
 * StickerManagerModal — your sticker controls, opened by tapping your stickers
 * on your own profile. Styled to match the Ambient Light menu (panel + label/
 * chip rows). Holds:
 *   - the same STICKERS button as the home row, to pop the store from here;
 *   - per-SHEET active on/off (owned sheets);
 *   - per-STICKER granular on/off.
 * Only active stickers feed your hero. Generative arrangement controls land next.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../lib/state/ModalContext';
import { SHEETS } from '../../lib/stickers/catalog';
import {
    useOwnedFor, useStickerPrefs, isActive,
    toggleSheetActive, toggleStickerActive,
} from '../../lib/stickers/owned';
import { StickerArt } from './StickerArt';

const VS15 = '︎';

export function StickerManagerModal({
    open, onClose, handle,
}: {
    open: boolean;
    onClose: () => void;
    handle: string;
}) {
    const { open: openStore } = useModal();
    const owned = useOwnedFor(handle, true);
    const { offSheets, offIds } = useStickerPrefs();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') return null;

    const ownedSheets = SHEETS.filter((sh) => owned.some((s) => s.sheet === sh.id));

    return createPortal(
        <div
            className="sticker-mgr-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Your stickers"
            onClick={onClose}
        >
            <div className="sticker-mgr" onClick={(e) => e.stopPropagation()}>
                <div className="smgr-head">
                    <span className="smgr-title">YOUR STICKERS</span>
                    <button
                        className="smgr-store"
                        type="button"
                        onClick={() => { onClose(); openStore('stickers'); }}
                    >
                        <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKERS
                    </button>
                    <span
                        className="smgr-close"
                        role="button"
                        tabIndex={0}
                        title="Close"
                        onClick={onClose}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
                    >
                        {`×${VS15}`}
                    </span>
                </div>

                <div className="smgr-row">
                    <span className="smgr-label">SHEETS</span>
                    <div className="smgr-chips">
                        {ownedSheets.map((sh) => {
                            const on = !offSheets.has(sh.id);
                            return (
                                <button
                                    key={sh.id}
                                    className={`smgr-chip${on ? ' active' : ''}`}
                                    type="button"
                                    onClick={() => toggleSheetActive(sh.id)}
                                >
                                    {sh.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="smgr-grid-wrap">
                    <span className="smgr-label">STICKERS</span>
                    <div className="smgr-grid">
                        {owned.map((s) => {
                            const on = isActive(s, offSheets, offIds);
                            return (
                                <button
                                    key={s.id}
                                    className={`smgr-tile${on ? '' : ' off'}`}
                                    type="button"
                                    title={`${s.name} — ${on ? 'on' : 'off'}`}
                                    onClick={() => toggleStickerActive(s.id)}
                                >
                                    <StickerArt sticker={s} size={34} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
