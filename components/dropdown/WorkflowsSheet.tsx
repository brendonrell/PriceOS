'use client';

/*
 * WorkflowsSheet — WORKFLOWS ☇ (Brendon, 2026-07-05): iOS-Shortcuts-style
 * automations, built on the To-Dos rails. The ONLY entry surface is the ☇
 * icon beside the To-Dos "+" (Brendon's call — the connect menu UI stays
 * untouched otherwise); it opens this modal: the value-prompt sheet shell
 * (dim backdrop + slide-up box, the AlbumPickerCard treatment) holding the
 * builder + the armed list.
 *
 * A workflow is BUILT, never written: pick a trigger, pick the payload, ARM.
 *   NEXT UPLOAD — "WHEN @artist UPLOADS → MINT ×n + TO-DO + NOTIFY"
 *   PRICE HIT   — "WHEN piece #id ≤ ◊x → TO-DO + NOTIFY" (Sentinel takes over)
 * Fired workflows stay as records wearing FIRED (one-shot; arm again freely).
 * The engine is WorkflowWatcher in the shell, riding the real feeds.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../lib/state/ToastContext';
import { getProject } from '../../lib/project/registry';
import {
    armWorkflow,
    getWorkflows,
    removeWorkflow,
    subscribeWorkflows,
    workflowSentence,
    type WorkflowRecord,
} from '../../lib/workflows/store';
import { formatEth } from '../../lib/format/eth';
import { MentionLookup } from '../MentionLookup';

type TriggerKind = 'upload' | 'price';

const CLOSE_FADE_MS = 250;

/* `inline` — the SAME builder + armed list mounted as the PriceOS Suite's
   ☇ app (2026-07-27): no backdrop, no slide-up, no portal — the content
   renders in place. The ☇ key beside the To-Dos + keeps opening the sheet
   form untouched. */
export function WorkflowsSheet({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
    const { showToast } = useToast();
    const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
    const [active, setActive] = useState(false);
    const closingRef = useRef(false);
    const [kind, setKind] = useState<TriggerKind>('upload');
    const [artist, setArtist] = useState('');
    /* The @artist field takes a handle, so it gets the same inline @name lookup
       the To-Dos and Notes composers use (Brendon, 2026-07-26). */
    const artistRef = useRef<HTMLInputElement>(null);
    const [artistCaret, setArtistCaret] = useState<number | null>(null);
    const [slug, setSlug] = useState('');
    const [tokenId, setTokenId] = useState('');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState('1');

    useEffect(() => {
        const read = () => setWorkflows(getWorkflows());
        read();
        return subscribeWorkflows(read);
    }, []);

    // Slide-up on mount; fade on dismiss (the value-prompt dance).
    useEffect(() => {
        const raf = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(raf);
    }, []);
    const dismiss = () => {
        if (closingRef.current || !onClose) return;
        closingRef.current = true;
        setActive(false);
        setTimeout(onClose, CLOSE_FADE_MS);
    };

    const armedCount = useMemo(() => workflows.filter((w) => w.firedAt == null).length, [workflows]);

    const arm = () => {
        if (kind === 'upload') {
            const a = artist.trim().replace(/^@/, '').toLowerCase();
            if (!a) return;
            const n = Math.max(0, Math.min(99, Math.round(Number(qty) || 0)));
            armWorkflow({ kind: 'upload', artist: a }, { todo: true, ...(n > 0 ? { qty: n } : {}) });
            showToast(`Workflow: ARMED · @${a.toUpperCase()} NEXT UPLOAD`);
        } else {
            const s = slug.trim().toLowerCase();
            const id = Math.round(Number(tokenId));
            const p = Number(price);
            if (!s || !getProject(s)) { showToast('Workflow: UNKNOWN PROJECT'); return; }
            if (!Number.isFinite(id) || id < 1 || !Number.isFinite(p) || p <= 0) return;
            armWorkflow({ kind: 'price', slug: s, tokenId: id, priceEth: p }, { todo: true });
            showToast(`Workflow: ARMED · ${s.toUpperCase()} #${id} ≤ ◊${formatEth(p)}`);
        }
        setArtist(''); setSlug(''); setTokenId(''); setPrice(''); setQty('1');
    };

    /* EDIT ✎ — beside the row's × (Brendon, 2026-07-28). A workflow is BUILT,
       never written, so editing one means loading it back into the builder:
       the pencil fills every field from the record and takes it off the armed
       list, so ARM re-arms the edited version. Armed rows only — a FIRED row
       is a record of what happened, not something to change. */
    const editWorkflow = (w: WorkflowRecord) => {
        if (w.trigger.kind === 'upload') {
            setKind('upload');
            setArtist(w.trigger.artist);
            setQty(String(w.actions.qty ?? 1));
        } else {
            setKind('price');
            setSlug(w.trigger.slug);
            setTokenId(w.trigger.tokenId != null ? String(w.trigger.tokenId) : '');
            setPrice(String(w.trigger.priceEth));
        }
        removeWorkflow(w.id);
        showToast('Workflow: EDITING');
    };

    const canArm = kind === 'upload'
        ? artist.trim().length > 0
        : slug.trim().length > 0 && Number(tokenId) >= 1 && Number(price) > 0;

    const content = (
        <>

                <div className="wf-compose">
                    <div className="wf-kind-row">
                        <button type="button" className={`wf-kind${kind === 'upload' ? ' on' : ''}`} onClick={() => setKind('upload')}>NEXT UPLOAD</button>
                        <button type="button" className={`wf-kind${kind === 'price' ? ' on' : ''}`} onClick={() => setKind('price')}>PRICE HIT</button>
                    </div>
                    {kind === 'upload' ? (
                        <div className="wf-fields">
                            <span className="wf-when">WHEN</span>
                            <input
                                ref={artistRef}
                                className="wf-input"
                                type="text"
                                placeholder="@artist"
                                value={artist}
                                onChange={(e) => { setArtist(e.target.value); setArtistCaret(e.target.selectionStart); }}
                                onKeyUp={(e) => setArtistCaret(e.currentTarget.selectionStart)}
                                onClick={(e) => setArtistCaret(e.currentTarget.selectionStart)}
                            />
                            <MentionLookup
                                value={artist}
                                caret={artistCaret}
                                anchorRef={artistRef}
                                onPick={(next, caretAfter) => {
                                    setArtist(next);
                                    setArtistCaret(caretAfter);
                                    const el = artistRef.current;
                                    if (el) {
                                        el.focus();
                                        requestAnimationFrame(() => el.setSelectionRange(caretAfter, caretAfter));
                                    }
                                }}
                            />
                            <span className="wf-when">UPLOADS → MINT ×</span>
                            <input
                                className="wf-input wf-input-num"
                                type="text"
                                inputMode="numeric"
                                value={qty}
                                onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                        </div>
                    ) : (
                        <div className="wf-fields">
                            <span className="wf-when">WHEN</span>
                            <input
                                className="wf-input"
                                type="text"
                                placeholder="project"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                            />
                            <span className="wf-when">#</span>
                            <input
                                className="wf-input wf-input-num"
                                type="text"
                                inputMode="numeric"
                                placeholder="id"
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                            <span className="wf-when">≤ ◊</span>
                            <input
                                className="wf-input wf-input-num"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.4"
                                value={price}
                                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </div>
                    )}
                    <button type="button" className="wf-arm" disabled={!canArm} onClick={arm}>
                        ARM
                    </button>
                </div>

                <div className="wf-list">
                    {workflows.length === 0 && (
                        <div className="todo-empty">No workflows yet — arm your first above.</div>
                    )}
                    {workflows.map((w) => (
                        <div key={w.id} className={`wf-row${w.firedAt != null ? ' fired' : ''}`}>
                            <span className="wf-sentence">
                                {workflowSentence(w)}
                                {w.firedAt != null && (
                                    w.firedSlug
                                        ? <a className="wf-fired" href={`/art/${w.firedSlug}`}>FIRED</a>
                                        : <span className="wf-fired">FIRED</span>
                                )}
                            </span>
                            {w.firedAt == null && (
                                <span
                                    className="todo-edit"
                                    role="button"
                                    tabIndex={0}
                                    title="Edit workflow"
                                    aria-label="Edit workflow"
                                    onClick={() => editWorkflow(w)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            editWorkflow(w);
                                        }
                                    }}
                                >
                                    {'✎︎'}
                                </span>
                            )}
                            <span
                                className="todo-del"
                                role="button"
                                tabIndex={0}
                                title="Remove workflow"
                                onClick={() => { removeWorkflow(w.id); showToast('Workflow: REMOVED'); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        removeWorkflow(w.id);
                                        showToast('Workflow: REMOVED');
                                    }
                                }}
                            >
                                {'×︎'}
                            </span>
                        </div>
                    ))}
            </div>
        </>
    );

    if (inline) {
        return (
            <div className="user-dropdown notifications-box is-open suite-wf">
                <div className="notif-header">
                    <span>WORKFLOWS <span className="notif-count">({armedCount})</span></span>
                </div>
                <div className="dropdown-divider" />
                {content}
            </div>
        );
    }

    return createPortal(
        <div
            className={`value-prompt-wrap mounted${active ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Workflows"
            onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <div className="value-prompt-box wf-sheet">
                <span
                    className="value-prompt-close-x"
                    onClick={dismiss}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); } }}
                    title="Close"
                >
                    {'×︎'}
                </span>
                <div className="value-prompt-title">☇︎ Workflows <span className="notif-count">({armedCount})</span></div>
                {content}
            </div>
        </div>,
        document.body,
    );
}
