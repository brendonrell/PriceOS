'use client';

/*
 * StickerManagerModal — your sticker controls, opened by tapping your stickers
 * on your own profile. Styled like the Ambient Light menu (label + chip rows).
 *
 * Self-contained: it reads its state ONCE when it opens and manages a LOCAL copy
 * from then on, so toggling a sheet/sticker updates instantly with no global
 * re-render (no flash). Each change is saved in the background (and the hero,
 * which has its own subscription, updates live).
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../lib/state/ModalContext';
import { SHEETS, type Sticker } from '../../lib/stickers/catalog';
import {
    computeOwnedFor, getOffSheets, getOffIds, isActive,
    toggleSheetActive, toggleStickerActive,
} from '../../lib/stickers/owned';
import {
    getArrange, getTilt, getExpand, setArrange, setTilt, setExpand, shuffleSeed,
    ARRANGES, TILTS, type Arrange, type Tilt,
} from '../../lib/stickers/heroPrefs';
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

    // Local state, seeded each time the menu opens — no global subscriptions.
    const [owned, setOwned] = useState<Sticker[]>([]);
    const [offSheets, setOffSheets] = useState<Set<string>>(new Set());
    const [offIds, setOffIds] = useState<Set<string>>(new Set());
    const [arrange, setArr] = useState<Arrange>('spread');
    const [tilt, setTl] = useState<Tilt>('soft');
    const [expand, setExp] = useState(false);

    useEffect(() => {
        if (!open) return;
        setOwned(computeOwnedFor(handle));
        setOffSheets(new Set(getOffSheets()));
        setOffIds(new Set(getOffIds()));
        setArr(getArrange());
        setTl(getTilt());
        setExp(getExpand());
    }, [open, handle]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') return null;

    const toggleSheet = (id: string) => {
        toggleSheetActive(id as Parameters<typeof toggleSheetActive>[0]);
        setOffSheets((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSticker = (id: string) => {
        toggleStickerActive(id);
        setOffIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const pickArrange = (a: Arrange) => { setArr(a); setArrange(a); };
    const pickTilt = (t: Tilt) => { setTl(t); setTilt(t); };
    const pickExpand = (b: boolean) => { setExp(b); setExpand(b); };

    const ownedSheets = SHEETS.filter((sh) => owned.some((s) => s.sheet === sh.id));

    return createPortal(
        <div className="sticker-mgr-backdrop" role="dialog" aria-modal="true" aria-label="Your stickers" onClick={onClose}>
            <div className="sticker-mgr" onClick={(e) => e.stopPropagation()}>
                <div className="smgr-head">
                    <span className="smgr-title">YOUR STICKERS</span>
                    <button className="smgr-store" type="button" onClick={() => { onClose(); openStore('stickers'); }}>
                        <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKER STORE
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
                    <span className="smgr-label">LAYOUT</span>
                    <div className="smgr-chips">
                        {ARRANGES.map((a) => (
                            <button key={a.id} className={`smgr-chip${arrange === a.id ? ' active' : ''}`} type="button" onClick={() => pickArrange(a.id)}>
                                {a.label}
                            </button>
                        ))}
                        <button className="smgr-chip smgr-shuffle" type="button" onClick={() => shuffleSeed()} title="Shuffle">
                            {`⟳${VS15}`}
                        </button>
                    </div>
                </div>

                <div className="smgr-row">
                    <span className="smgr-label">WIDTH</span>
                    <div className="smgr-chips">
                        <button className={`smgr-chip${!expand ? ' active' : ''}`} type="button" onClick={() => pickExpand(false)}>FIT</button>
                        <button className={`smgr-chip${expand ? ' active' : ''}`} type="button" onClick={() => pickExpand(true)}>WIDE</button>
                    </div>
                </div>

                <div className="smgr-row">
                    <span className="smgr-label">TILT</span>
                    <div className="smgr-chips">
                        {TILTS.map((tl) => (
                            <button key={tl.id} className={`smgr-chip${tilt === tl.id ? ' active' : ''}`} type="button" onClick={() => pickTilt(tl.id)}>
                                {tl.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="smgr-row">
                    <span className="smgr-label">SHEETS</span>
                    <div className="smgr-chips">
                        {ownedSheets.map((sh) => {
                            const on = !offSheets.has(sh.id);
                            return (
                                <button key={sh.id} className={`smgr-chip${on ? ' active' : ''}`} type="button" onClick={() => toggleSheet(sh.id)}>
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
                                    onClick={() => toggleSticker(s.id)}
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
