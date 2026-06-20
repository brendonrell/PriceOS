'use client';

/*
 * SpiteBookModal — "THE SPITE BOOK"
 *
 * A whimsical Spell Book feature: tapping the Spite Book pill opens a literal
 * two-page book on screen. You write a name on a page's ruled line to inscribe
 * it; tap the small mark beside a name to scratch it out. The list lives in
 * spiteStore and persists across sessions.
 *
 * Mobile-first: the book fills the viewport width with two pages flanking a
 * central spine, capped to a comfortable max on desktop. Self-contained
 * parchment aesthetic — independent of the active colorway, like StickersModal's
 * own surface.
 *
 * Each page keeps an always-present writing line (the AddLine input). Tapping
 * it — or anywhere on the page — focuses it directly inside the tap gesture, so
 * iOS reliably raises the keyboard (a programmatic focus AFTER a re-render does
 * not). Mounted once in PriceOSShell; rides ModalContext for scroll-lock +
 * Escape-to-close.
 */

import { useEffect, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import {
    getSpiteNames,
    addSpiteName,
    removeSpiteName,
    subscribeSpite,
    isSpited,
} from '../lib/pins/spiteStore';
import { validateSpiteHandle } from '../lib/pins/spiteValidate';

const VS15 = '︎';

type Side = 'left' | 'right';

/* A page's writing line — its own draft state, always in the DOM so a tap
   focuses it natively (iOS keyboard). Commits on Enter or blur. */
function AddLine({
    placeholder,
    onAdd,
    inputRef,
}: {
    placeholder: string;
    onAdd: (name: string) => Promise<boolean>;
    inputRef: React.RefObject<HTMLInputElement>;
}) {
    const [value, setValue] = useState('');
    const submit = async () => {
        const t = value.trim();
        if (!t) return;
        const ok = await onAdd(t);
        if (ok) setValue(''); // keep the text on a rejection so they can fix it
    };
    return (
        <div className="spite-line spite-line--add">
            <input
                ref={inputRef}
                className="spite-input"
                value={value}
                placeholder={placeholder}
                maxLength={40}
                spellCheck={false}
                autoCorrect="off"
                onChange={(e) => setValue(e.target.value)}
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
    const isOpen = openModal?.name === 'spiteBook';

    const [names, setNames] = useState<readonly string[]>([]);
    const leftInputRef = useRef<HTMLInputElement>(null);
    const rightInputRef = useRef<HTMLInputElement>(null);

    // Subscribe to the spite list (hydrates from localStorage on first read).
    useEffect(() => {
        setNames(getSpiteNames().slice());
        return subscribeSpite((next) => setNames(next.slice()));
    }, []);

    const handleAdd = async (name: string): Promise<boolean> => {
        if (isSpited(name)) {
            showToast('Spite Book: ALREADY NAMED');
            return true;
        }
        const valid = await validateSpiteHandle(name);
        if (!valid) {
            showToast('Spite Book: NOT FOUND');
            return false;
        }
        const added = addSpiteName(name);
        showToast(
            added
                ? `Spite Book: ADDED · ${getSpiteNames().length}`
                : 'Spite Book: ALREADY NAMED'
        );
        return added;
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
        const inputRef = side === 'left' ? leftInputRef : rightInputRef;
        const placeholder =
            names.length === 0 && side === 'left'
                ? 'inscribe a name…'
                : `✛${VS15} add a name`;
        return (
            <div
                className="spite-page"
                onClick={() => inputRef.current?.focus()}
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
                    <AddLine
                        placeholder={placeholder}
                        onAdd={handleAdd}
                        inputRef={inputRef}
                    />
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
