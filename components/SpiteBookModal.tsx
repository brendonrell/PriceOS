'use client';

/*
 * SpiteBookModal — "THE SPITE BOOK"
 *
 * A whimsical Spell Book feature: tapping the Spite Book pill opens a literal
 * book. Ten unnumbered parchment pages (five spreads); drag a page sideways to
 * turn it like an eReader. Write a real @name on a ruled line to inscribe it;
 * tap the mark beside a name to scratch it out. A name only takes if it's a
 * real user/project on the site (validated) — otherwise it's rejected. The
 * list lives in spiteStore (matched @-insensitively across the site).
 *
 * The turn is a 3D sheet-flip driven by the drag, not a paper-curl (which the
 * web can't do natively). Faces shown mid-flip are read-only snapshots; the
 * resting spread carries the live inputs + scratch marks, so typing/iOS-focus
 * only ever happens on a flat page.
 *
 * Mounted once in PriceOSShell; rides ModalContext for scroll-lock + Escape.
 */

import { useEffect, useRef, useState } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import {
    getSpiteSlots,
    addSpiteNameAt,
    removeSpiteAt,
    subscribeSpite,
    isSpited,
    SPITE_SLOTS,
} from '../lib/pins/spiteStore';
import { validateSpiteHandle } from '../lib/pins/spiteValidate';

const VS15 = '︎';

const LINES_PER_PAGE = 6;
const PAGES = SPITE_SLOTS / LINES_PER_PAGE; // 12
const MAX_SPREAD = Math.ceil(PAGES / 2) - 1; // 0..5

type FlipDir = 'fwd' | 'back';

/* An empty slot's writing line — own draft state, always in the DOM so a tap
   focuses it natively (iOS keyboard). Commits on Enter or blur; keeps the text
   if the name is rejected so it can be fixed. Every blank line is one of these,
   so any slot can be written into directly (Brendon, 2026-06-24). */
function AddLine({
    slot,
    onAdd,
    hint,
}: {
    slot: number;
    onAdd: (slot: number, name: string) => Promise<boolean>;
    hint: boolean;
}) {
    const [value, setValue] = useState('');
    const submit = async () => {
        const t = value.trim();
        if (!t) return;
        const ok = await onAdd(slot, t);
        if (ok) setValue('');
    };
    return (
        <div className="spite-line spite-line--add">
            <input
                className="spite-input"
                value={value}
                placeholder={hint ? `✛${VS15} name a foe` : undefined}
                maxLength={40}
                spellCheck={false}
                autoCorrect="off"
                onChange={(e) => setValue(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                    } else if (e.key === 'Escape') {
                        setValue('');
                        e.currentTarget.blur();
                    }
                }}
                onBlur={submit}
            />
        </div>
    );
}

export default function SpiteBookModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const { isOpen, isTopStacked } = useModalLayer('spiteBook');

    const [slots, setSlots] = useState<readonly (string | null)[]>([]);
    const [spread, setSpread] = useState(0);
    const [flip, setFlip] = useState<FlipDir | null>(null);

    const spreadRef = useRef<HTMLDivElement>(null);
    const leafRef = useRef<HTMLDivElement>(null);

    // Drag bookkeeping (refs so pointermove doesn't churn React state).
    const drag = useRef<{ startX: number; dir: FlipDir | null; committed: boolean }>({
        startX: 0,
        dir: null,
        committed: false,
    });

    // Subscribe to the spite slots (hydrates from localStorage on first read).
    useEffect(() => {
        setSlots(getSpiteSlots());
        return subscribeSpite(() => setSlots(getSpiteSlots()));
    }, []);

    // Reset to the first spread each time the book opens.
    useEffect(() => {
        if (isOpen) {
            setSpread(0);
            setFlip(null);
        }
    }, [isOpen]);

    const handleAdd = async (slot: number, name: string): Promise<boolean> => {
        if (isSpited(name)) {
            showToast('Spite Book: ALREADY NAMED');
            return false;
        }
        const valid = await validateSpiteHandle(name);
        if (!valid) {
            showToast('Spite Book: NOT FOUND');
            return false;
        }
        const added = addSpiteNameAt(slot, name);
        showToast(
            added
                ? `Spite Book: ADDED · ${getSpiteSlots().filter(Boolean).length}`
                : 'Spite Book: ALREADY NAMED'
        );
        return added;
    };

    const scratch = (slot: number) => {
        removeSpiteAt(slot);
        showToast(`Spite Book: SCRATCHED · ${getSpiteSlots().filter(Boolean).length}`);
    };

    // The first empty slot overall — carries the "name a foe" hint placeholder.
    const firstEmpty = slots.findIndex((s) => !s);

    /* Render one page's six ruled lines. Every line maps to a fixed slot: a
       written name (with its scratch mark on live pages) or an empty, tappable
       writing line on live pages (Brendon, 2026-06-24). Snapshot faces
       (mid-flip) are text-only. */
    const renderLines = (page: number, live: boolean) => {
        const rows: React.ReactNode[] = [];
        for (let line = 0; line < LINES_PER_PAGE; line++) {
            const slot = page * LINES_PER_PAGE + line;
            const name = slots[slot] ?? null;
            if (name) {
                rows.push(
                    <div className="spite-line spite-line--name" key={`n-${slot}`}>
                        <span className="spite-name">{name}</span>
                        {live && (
                            <span
                                className="spite-scratch"
                                role="button"
                                tabIndex={0}
                                title="Scratch out"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); scratch(slot); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scratch(slot); }
                                }}
                            >
                                {`✗${VS15}`}
                            </span>
                        )}
                    </div>
                );
            } else if (live) {
                rows.push(<AddLine key={`a-${slot}`} slot={slot} onAdd={handleAdd} hint={slot === firstEmpty} />);
            } else {
                rows.push(<div className="spite-line spite-line--blank" key={`b-${slot}`} />);
            }
        }
        return <div className="spite-page-lines">{rows}</div>;
    };

    const renderPage = (page: number, live: boolean, side: 'left' | 'right') => (
        <div className={`spite-page spite-page--${side}`}>
            {renderLines(page, live)}
            <span className="spite-page-num" aria-hidden="true">{page + 1}</span>
        </div>
    );

    // ── Drag-to-turn ──────────────────────────────────────────────────────
    const setLeafTransform = (deg: number, withTransition: boolean) => {
        const leaf = leafRef.current;
        if (!leaf) return;
        leaf.style.transition = withTransition ? 'transform 0.35s ease' : 'none';
        leaf.style.transform = `rotateY(${deg}deg)`;
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (flip) return;
        drag.current = { startX: e.clientX, dir: null, committed: false };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (e.buttons === 0 && e.pointerType === 'mouse') return;
        const dx = e.clientX - d.startX;
        const w = spreadRef.current?.clientWidth ?? 1;

        // Decide a direction once the drag is meaningful.
        if (!d.dir) {
            if (dx <= -6 && spread < MAX_SPREAD) d.dir = 'fwd';
            else if (dx >= 6 && spread > 0) d.dir = 'back';
            else return;
            setFlip(d.dir);
            return; // leaf mounts this frame; transform applies on the next move
        }

        if (d.dir === 'fwd') {
            // right leaf rotates 0 → -180 as dx goes 0 → -w
            const deg = Math.max(-180, Math.min(0, (dx / w) * 180));
            setLeafTransform(deg, false);
        } else {
            // left leaf rotates 0 → 180 as dx goes 0 → w
            const deg = Math.min(180, Math.max(0, (dx / w) * 180));
            setLeafTransform(deg, false);
        }
    };

    const finishFlip = (dir: FlipDir, commit: boolean) => {
        const target = commit ? (dir === 'fwd' ? -180 : 180) : 0;
        setLeafTransform(target, true);
        window.setTimeout(() => {
            if (commit) setSpread((s) => (dir === 'fwd' ? s + 1 : s - 1));
            setFlip(null);
        }, 360);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d.dir) return;
        const dx = e.clientX - d.startX;
        const w = spreadRef.current?.clientWidth ?? 1;
        const commit = Math.abs(dx) > w * 0.22;
        finishFlip(d.dir, commit);
        d.dir = null;
    };

    return (
        <div
            className={`spite-backdrop${isOpen ? ' active' : ''}`}
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="The Spite Book"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="spite-book" onClick={(e) => e.stopPropagation()}>
                <div
                    className="spite-close"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                >
                    {`×${VS15}`}
                </div>

                <div className="spite-title">
                    <span className="spite-title-glyph">{`⌧${VS15}`}</span>
                    <span className="spite-title-text">THE SPITE BOOK</span>
                </div>

                <div
                    className="spite-spread"
                    ref={spreadRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {/* Live spread underneath. During a forward flip the upcoming
                        right page peeks through; during a back flip the previous
                        left page does. */}
                    {renderPage(flip === 'fwd' ? spread * 2 : (flip === 'back' ? spread * 2 - 2 : spread * 2), true, 'left')}
                    <div className="spite-spine" aria-hidden="true" />
                    {renderPage(flip === 'fwd' ? spread * 2 + 3 : spread * 2 + 1, true, 'right')}

                    {/* The turning leaf — two read-only faces. */}
                    {flip && (
                        <div
                            className={`spite-leaf spite-leaf--${flip}`}
                            ref={leafRef}
                        >
                            <div className="spite-leaf-face spite-leaf-front">
                                {renderPage(
                                    flip === 'fwd' ? spread * 2 + 1 : spread * 2,
                                    false,
                                    flip === 'fwd' ? 'right' : 'left'
                                )}
                            </div>
                            <div className="spite-leaf-face spite-leaf-back">
                                {renderPage(
                                    flip === 'fwd' ? spread * 2 + 2 : spread * 2 - 1,
                                    false,
                                    flip === 'fwd' ? 'left' : 'right'
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="spite-foot">
                    {(() => {
                        const count = slots.filter(Boolean).length;
                        return count === 0
                            ? 'an empty grudge'
                            : `${count} ${count === 1 ? 'name' : 'names'} inscribed`;
                    })()}
                </div>
            </div>
        </div>
    );
}
