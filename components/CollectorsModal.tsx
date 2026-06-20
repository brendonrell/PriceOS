'use client';

/*
 * CollectorsModal
 *
 * Sim id #collectorsModal (sim.html 5418–5444). Triggered from the
 * project page hero stats row — the "67 PPL" stat
 * (sim 5124, openCollectorsModal). Mounted globally in PriceOSShell
 * so the same pattern as OutputPreview: any caller can fire
 * useModal().open('collectors').
 *
 * Mock data only — port of the static collector list in sim
 * (You + 11 names + counts). Live values land when indexer wires up.
 *
 * Scroll arrows mirror sim's scrollCollectors(±1): ref-based scrollBy
 * on the list wrapper. With ~12 short rows they're decorative on
 * desktop but iOS Safari can clip the list at small viewport heights
 * so they stay functional.
 *
 * Hooks discipline: all hooks at the top, internals gate on isOpen,
 * no early return. Same rule OutputPreview follows.
 */

import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useSpiteMatcher } from '../lib/pins/spiteStore';

const VS15 = '\uFE0E';

interface CollectorRow {
    handle: string;
    count: number;
    artist?: boolean;
}

const COLLECTORS: CollectorRow[] = [
    { handle: 'You', count: 3 },
    { handle: '@matty', count: 14 },
    { handle: '@atlasforge', count: 9 },
    { handle: '@Darold', count: 7 },
    { handle: '@gmoney', count: 5 },
    { handle: '@thefunnyguys', count: 4 },
    { handle: '@ClownVamp', count: 4 },
    { handle: '@OtherDarold', count: 3 },
    { handle: '@Trinity', count: 3 },
    { handle: '@willpop', count: 2 },
    { handle: '@cspok', count: 2 },
    { handle: '@siggi', count: 2, artist: true },
    { handle: '@CCDDBB', count: 1, artist: true },
];

export default function CollectorsModal() {
    const { openModal, close } = useModal();
    const isSpited = useSpiteMatcher();
    const listRef = useRef<HTMLDivElement>(null);

    const isOpen = openModal?.name === 'collectors';

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    const scroll = useCallback((dir: -1 | 1) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollBy({ top: dir * 80, behavior: 'smooth' });
    }, []);

    return (
        <div
            id="collectorsModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
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
                {'\u00D7'}
                {VS15}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 300 }}
            >
                <div className="modal-title" style={{ marginBottom: 0 }}>
                    OWNERS
                </div>
                <div
                    className="scroll-arrow dark-arrow"
                    role="button"
                    tabIndex={0}
                    onClick={() => scroll(-1)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            scroll(-1);
                        }
                    }}
                    title="Scroll Up"
                >
                    {'\u21E1'}
                    {VS15}
                </div>
                <div
                    className="modal-fields-wrap collectors-list"
                    id="collectorsList"
                    ref={listRef}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            fontSize: 14,
                            textAlign: 'left',
                            padding: 10,
                            fontWeight: 'bold',
                            fontFamily: "'Courier New', Courier, monospace",
                        }}
                    >
                        {COLLECTORS.map((c) => (
                            <span
                                key={c.handle}
                                className={`hover-link${isSpited(c.handle) ? ' spited' : ''}`}
                                role="link"
                                tabIndex={0}
                            >
                                {c.handle}
                                {c.artist && (
                                    <span
                                        className="artist-tag"
                                        aria-label="artist"
                                    >
                                        {'✺\uFE0E'}
                                    </span>
                                )}{' '}
                                ({c.count})
                            </span>
                        ))}
                    </div>
                </div>
                <div
                    className="scroll-arrow dark-arrow"
                    role="button"
                    tabIndex={0}
                    onClick={() => scroll(1)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            scroll(1);
                        }
                    }}
                    title="Scroll Down"
                >
                    {'\u21E3'}
                    {VS15}
                </div>
                <div className="modal-stats-bottom">UNIQUE COLLECTORS: 68%</div>
            </div>
        </div>
    );
}
