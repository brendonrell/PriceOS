'use client';

/*
 * SpiteBookModal — "THE SPITE BOOK"
 *
 * A whimsical Spell Book feature: tapping the Spite Book pill opens a literal
 * two-page book on screen. You tap a page to inscribe a name; tap the small
 * mark beside a name to scratch it out. The list lives in spiteStore and
 * persists across sessions.
 *
 * Mobile-first: the book fills the viewport width with two pages flanking a
 * central spine, capped to a comfortable max on desktop. Self-contained
 * parchment aesthetic — independent of the active colorway, like StickersModal's
 * own surface.
 *
 * Rides ModalContext like every other modal: isOpen = openModal === 'spiteBook',
 * inheriting the shared scroll-lock + Escape-to-close. Mounted once in
 * PriceOSShell.
 */

import { useEffect, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import {
    getSpiteNames,
    addSpiteName,
    removeSpiteName,
    subscribeSpite,
} from '../lib/pins/spiteStore';

const VS15 = '︎';

type Side = 'left' | 'right';

export default function SpiteBookModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'spiteBook';

    const [names, setNames] = useState<readonly string[]>([]);
    const [adding, setAdding] = useState<Side | null>(null);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Subscribe to the spite list (hydrates from localStorage on first read).
    useEffect(() => {
        setNames(getSpiteNames().slice());
        return subscribeSpite((next) => setNames(next.slice()));
    }, []);

    // Reset the add field whenever the book closes.
    useEffect(() => {
        if (!isOpen) {
            setAdding(null);
            setDraft('');
        }
    }, [isOpen]);

    // Focus the quill input as soon as a page opens it.
    useEffect(() => {
        if (adding) inputRef.current?.focus();
    }, [adding]);

    const beginAdd = (side: Side) => {
        setAdding(side);
        setDraft('');
    };

    const commit = () => {
        const ok = addSpiteName(draft);
        if (ok) showToast(`Spite Book: ADDED · ${getSpiteNames().length}`);
        else if (draft.trim()) showToast('Spite Book: ALREADY NAMED');
        setDraft('');
        setAdding(null);
    };

    const scratch = (name: string) => {
        removeSpiteName(name);
        showToast(`Spite Book: SCRATCHED · ${getSpiteNames().length}`);
    };

    // Split the list across the two pages, left fills first.
    const mid = Math.ceil(names.length / 2);
    const pages: Record<Side, string[]> = {
        left: names.slice(0, mid),
        right: names.slice(mid),
    };

    const renderPage = (side: Side) => {
        const list = pages[side];
        const empty = names.length === 0;
        return (
            <div
                className="spite-page"
                onClick={(e) => {
                    // Tapping blank page space opens the quill on this page.
                    if (e.target === e.currentTarget) beginAdd(side);
                }}
            >
                <div className="spite-page-lines">
                    {list.map((name) => (
                        <div className="spite-line spite-line--name" key={name}>
                            <span className="spite-name">{name}</span>
                            <span
                                className="spite-scratch"
                                role="button"
                                tabIndex={0}
                                title="Scratch out"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    scratch(name);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        scratch(name);
                                    }
                                }}
                            >
                                {`✗${VS15}`}
                            </span>
                        </div>
                    ))}

                    {adding === side ? (
                        <div className="spite-line spite-line--add">
                            <input
                                ref={inputRef}
                                className="spite-input"
                                value={draft}
                                placeholder="name a foe…"
                                maxLength={40}
                                spellCheck={false}
                                autoCorrect="off"
                                onChange={(e) => setDraft(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commit();
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setDraft('');
                                        setAdding(null);
                                    }
                                }}
                                onBlur={commit}
                            />
                        </div>
                    ) : (
                        <div
                            className="spite-line spite-line--ghost"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                beginAdd(side);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    beginAdd(side);
                                }
                            }}
                        >
                            {empty && side === 'left'
                                ? 'tap to inscribe a name…'
                                : `${'✛'}${VS15} add a name`}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`spite-backdrop${isOpen ? ' active' : ''}`}
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

                <div className="spite-spread">
                    {renderPage('left')}
                    <div className="spite-spine" aria-hidden="true" />
                    {renderPage('right')}
                </div>

                <div className="spite-foot">
                    {names.length === 0
                        ? 'an empty grudge'
                        : `${names.length} ${names.length === 1 ? 'name' : 'names'} inscribed`}
                </div>
            </div>
        </div>
    );
}
