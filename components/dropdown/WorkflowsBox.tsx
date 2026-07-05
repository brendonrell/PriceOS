'use client';

/*
 * WorkflowsBox — WORKFLOWS in the connect menu (Brendon, 2026-07-05):
 * iOS-Shortcuts-style automations, built on the To-Dos rails. Same accordion
 * family as TO-DOS / NOTES (AccordionBox + setAccordion exclusivity).
 *
 * A workflow is BUILT, never written: pick a trigger, pick the payload, ARM.
 *   UPLOAD — "WHEN @artist UPLOADS → MINT ×n + TO-DO + NOTIFY"
 *   PRICE  — "WHEN PIECE #id ≤ ◊x → TO-DO + NOTIFY" (the Sentinel takes over)
 * Fired workflows stay as records wearing FIRED (one-shot; arm again freely).
 * The engine is WorkflowWatcher in the shell, riding the real feeds.
 */

import { useEffect, useMemo, useState } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
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

type TriggerKind = 'upload' | 'price';

export function WorkflowsBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const { showToast } = useToast();
    const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
    const [composeOpen, setComposeOpen] = useState(false);
    const [kind, setKind] = useState<TriggerKind>('upload');
    const [artist, setArtist] = useState('');
    const [slug, setSlug] = useState('');
    const [tokenId, setTokenId] = useState('');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState('1');

    useEffect(() => {
        const read = () => setWorkflows(getWorkflows());
        read();
        return subscribeWorkflows(read);
    }, []);

    const armedCount = useMemo(() => workflows.filter((w) => w.firedAt == null).length, [workflows]);
    const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

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
            showToast(`Workflow: ARMED · ${s.toUpperCase()} #${id} ≤ ◊${p}`);
        }
        setArtist(''); setSlug(''); setTokenId(''); setPrice(''); setQty('1');
        setComposeOpen(false);
    };

    const canArm = kind === 'upload'
        ? artist.trim().length > 0
        : slug.trim().length > 0 && Number(tokenId) >= 1 && Number(price) > 0;

    return (
        <AccordionBox
            boxId="workflowsBox"
            listId="workflowsList"
            open={notifs.workflows}
            onHeaderClick={() => setAccordion('workflows', !notifs.workflows)}
            header={
                <span className="todos-header-row">
                    <span>
                        WORKFLOWS <span className="notif-count">({armedCount})</span>
                    </span>
                    {notifs.workflows && (
                        <span
                            className={`todos-add-btn${composeOpen ? ' is-on' : ''}`}
                            role="button"
                            tabIndex={0}
                            title="Arm a workflow"
                            onClick={(e) => { stop(e); setComposeOpen((v) => !v); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    stop(e);
                                    setComposeOpen((v) => !v);
                                }
                            }}
                        >
                            +
                        </span>
                    )}
                </span>
            }
        >
            {composeOpen && (
                <div className="wf-compose" onClick={stop}>
                    <div className="wf-kind-row">
                        <button type="button" className={`wf-kind${kind === 'upload' ? ' on' : ''}`} onClick={() => setKind('upload')}>NEXT UPLOAD</button>
                        <button type="button" className={`wf-kind${kind === 'price' ? ' on' : ''}`} onClick={() => setKind('price')}>PRICE HIT</button>
                    </div>
                    {kind === 'upload' ? (
                        <div className="wf-fields">
                            <span className="wf-when">WHEN</span>
                            <input
                                className="wf-input"
                                type="text"
                                placeholder="@artist"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
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
            )}

            {workflows.length === 0 && !composeOpen && (
                <div className="todo-empty">No workflows yet — tap + to arm one.</div>
            )}

            {workflows.map((w) => (
                <div key={w.id} className={`wf-row${w.firedAt != null ? ' fired' : ''}`}>
                    <span className="wf-sentence">
                        {workflowSentence(w)}
                        {w.firedAt != null && (
                            w.firedSlug
                                ? <a className="wf-fired" href={`/art/${w.firedSlug}`} onClick={stop}>FIRED</a>
                                : <span className="wf-fired">FIRED</span>
                        )}
                    </span>
                    <span
                        className="todo-del"
                        role="button"
                        tabIndex={0}
                        title="Remove workflow"
                        onClick={(e) => { stop(e); removeWorkflow(w.id); showToast('Workflow: REMOVED'); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                stop(e);
                                removeWorkflow(w.id);
                                showToast('Workflow: REMOVED');
                            }
                        }}
                    >
                        {'×︎'}
                    </span>
                </div>
            ))}
        </AccordionBox>
    );
}
