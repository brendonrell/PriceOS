'use client';

/*
 * WorkflowWatcher — the engine behind WORKFLOWS. Mounted once in the shell
 * (TodoReminders pattern); invisible. Watches every armed workflow against
 * the app's REAL feeds and fires it once:
 *
 *   upload triggers — polls the same home feed the news carousel reads
 *     (visible-tab only): a project by the watched @artist whose upload
 *     moment is AFTER the workflow was armed ⇒ FIRE.
 *   price triggers — rides the exact live listing feed the grail pins and
 *     the To-Dos Sentinel read: watched piece at/under the target ⇒ FIRE.
 *
 * Firing = toast (casing rule) + optionally a real To-Do carrying the intent
 * ("MINT ×3 …" rides the To-Dos rails, deep-linked for piece triggers).
 * One-shot: the record stays, wearing FIRED.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { priceOf, useStarredPrices } from '../../lib/pins/starredPriceStore';
import { addOutputTodo, addRawTodo } from '../../lib/todos/todoStore';
import { getProject } from '../../lib/project/registry';
import {
    getWorkflows,
    markFired,
    subscribeWorkflows,
    type WorkflowRecord,
} from '../../lib/workflows/store';

const POLL_MS = 120_000;

interface UploadRow { slug: string; uploaded_at: number | null }

export default function WorkflowWatcher() {
    const { showToast } = useToast();
    const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
    const firedThisSession = useRef(new Set<string>());

    useEffect(() => {
        const read = () => setWorkflows(getWorkflows());
        read();
        return subscribeWorkflows(read);
    }, []);

    const armed = useMemo(() => workflows.filter((w) => w.firedAt == null), [workflows]);

    const fire = (w: WorkflowRecord, slug: string, line: string) => {
        if (firedThisSession.current.has(w.id)) return;
        firedThisSession.current.add(w.id);
        markFired(w.id, slug);
        showToast(`Workflow: FIRED · ${line}`);
        if (w.actions.todo || w.actions.qty) {
            if (w.trigger.kind === 'price' && w.trigger.tokenId != null) {
                // A BUY to-do with the target price — the Sentinel takes over.
                addOutputTodo(slug, w.trigger.tokenId, 'BUY', { priceEth: w.trigger.priceEth });
            } else {
                const name = getProject(slug)?.displayName ?? slug.toUpperCase();
                addRawTodo({
                    text: w.actions.qty ? `MINT ×${w.actions.qty} ${name}` : `CHECK ${name}`,
                    labels: ['workflow'],
                    priority: 1,
                });
            }
        }
    };

    /* ── Upload triggers — poll the home feed while the tab is visible. ───── */
    const uploadArtists = useMemo(
        () => armed.filter((w) => w.trigger.kind === 'upload'),
        [armed],
    );
    useEffect(() => {
        if (uploadArtists.length === 0) return;
        let cancelled = false;
        const sweep = async () => {
            if (document.hidden) return;
            try {
                const r = await fetch('/api/home');
                if (!r.ok) return;
                const feed = await r.json() as { uploads?: UploadRow[]; minting_now?: UploadRow[] };
                if (cancelled) return;
                const rows = [...(feed.uploads ?? []), ...(feed.minting_now ?? [])];
                for (const w of uploadArtists) {
                    if (w.trigger.kind !== 'upload') continue;
                    for (const row of rows) {
                        if (!row.uploaded_at || row.uploaded_at <= w.armedAt) continue;
                        const artist = getProject(row.slug)?.artistHandle?.toLowerCase();
                        if (artist === w.trigger.artist) {
                            fire(w, row.slug, `@${artist} UPLOADED ${getProject(row.slug)?.displayName ?? row.slug}`);
                            break;
                        }
                    }
                }
            } catch { /* next sweep covers it */ }
        };
        void sweep();
        const t = window.setInterval(() => { void sweep(); }, POLL_MS);
        const onVis = () => { if (!document.hidden) void sweep(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            cancelled = true;
            window.clearInterval(t);
            document.removeEventListener('visibilitychange', onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploadArtists]);

    /* ── Price triggers — the same live feed the Sentinel reads. ──────────── */
    const priceWatch = useMemo(
        () => armed.filter((w) => w.trigger.kind === 'price' && w.trigger.tokenId != null),
        [armed],
    );
    const slugs = useMemo(
        () => Array.from(new Set(priceWatch.map((w) => (w.trigger.kind === 'price' ? w.trigger.slug : '')))).filter(Boolean),
        [priceWatch],
    );
    const priceVersion = useStarredPrices(slugs);
    useEffect(() => {
        for (const w of priceWatch) {
            if (w.trigger.kind !== 'price' || w.trigger.tokenId == null) continue;
            const p = priceOf(w.trigger.slug, w.trigger.tokenId);
            if (p != null && p <= w.trigger.priceEth) {
                const name = getProject(w.trigger.slug)?.displayName ?? w.trigger.slug.toUpperCase();
                fire(w, w.trigger.slug, `${name} #${w.trigger.tokenId} ≤ ◊${w.trigger.priceEth}`);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceVersion, priceWatch]);

    return null;
}
