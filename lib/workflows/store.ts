/*
 * workflowStore — WORKFLOWS (Brendon, 2026-07-05): iOS-Shortcuts-style
 * automations the power user arms to make their PD life easier. The canonical
 * example: "attempt to MINT ×3 of @artist's NEXT uploaded project."
 *
 * Built on the To-Dos rails exactly as Brendon suggested: same store pattern
 * (localStorage mirror + account write-through via the settings envelope +
 * change event), same casing rules, and fired workflows can drop a real To-Do
 * so the intent lands in the list the user already lives in.
 *
 * v1 firing model (honest): workflows are WATCHED while PD is open — the
 * watcher rides the same live feeds the Sentinel and grail pins use. A fired
 * workflow is one-shot (record kept, wearing FIRED); re-arm by creating it
 * again. Server-side firing while the app is closed rides the reminder cron
 * later — the records already live in the account envelope it reads.
 *
 * Workflows are numbered, never named — no free text anywhere (house rule).
 */

import { pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';
import { getProject } from '../project/registry';
import type { WorkflowRecord } from '../supabase';

export type { WorkflowRecord } from '../supabase';

const KEY = 'pd_workflows';
export const WORKFLOWS_CHANGED_EVENT = 'pd:workflows-changed';

let seq = 0;
const newId = () => `wf_${Date.now().toString(36)}_${(++seq).toString(36)}`;

function sanitize(raw: unknown): WorkflowRecord[] {
    if (!Array.isArray(raw)) return [];
    const out: WorkflowRecord[] = [];
    for (const w of raw) {
        if (!w || typeof w !== 'object') continue;
        const r = w as Partial<WorkflowRecord> & { trigger?: Record<string, unknown> };
        if (typeof r.id !== 'string' || !r.trigger || typeof r.trigger !== 'object') continue;
        const t = r.trigger as Record<string, unknown>;
        let trigger: WorkflowRecord['trigger'] | null = null;
        if (t.kind === 'upload' && typeof t.artist === 'string' && t.artist) {
            trigger = { kind: 'upload', artist: t.artist.toLowerCase() };
        } else if (t.kind === 'price' && typeof t.slug === 'string' && typeof t.priceEth === 'number' && t.priceEth > 0) {
            trigger = {
                kind: 'price',
                slug: t.slug.toLowerCase(),
                tokenId: typeof t.tokenId === 'number' ? t.tokenId : null,
                priceEth: t.priceEth,
            };
        }
        if (!trigger) continue;
        out.push({
            id: r.id,
            trigger,
            actions: {
                todo: !!r.actions?.todo,
                ...(typeof r.actions?.qty === 'number' && r.actions.qty > 0 ? { qty: Math.min(99, Math.round(r.actions.qty)) } : {}),
            },
            armedAt: typeof r.armedAt === 'number' ? r.armedAt : 0,
            firedAt: typeof r.firedAt === 'number' ? r.firedAt : null,
            ...(typeof r.firedSlug === 'string' ? { firedSlug: r.firedSlug } : {}),
        });
    }
    return out;
}

function read(): WorkflowRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        return sanitize(JSON.parse(window.localStorage.getItem(KEY) || '[]'));
    } catch {
        return [];
    }
}

function commit(next: WorkflowRecord[]): void {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    try { pushSettings({ workflows: next }); } catch { /* never break a local write */ }
    window.dispatchEvent(new Event(WORKFLOWS_CHANGED_EVENT));
}

export function getWorkflows(): WorkflowRecord[] {
    return read();
}

export function subscribeWorkflows(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(WORKFLOWS_CHANGED_EVENT, cb);
    window.addEventListener('storage', cb);
    window.addEventListener(USERSTATE_HYDRATED_EVENT, cb);
    return () => {
        window.removeEventListener(WORKFLOWS_CHANGED_EVENT, cb);
        window.removeEventListener('storage', cb);
        window.removeEventListener(USERSTATE_HYDRATED_EVENT, cb);
    };
}

export function armWorkflow(
    trigger: WorkflowRecord['trigger'],
    actions: WorkflowRecord['actions'],
): WorkflowRecord {
    const rec: WorkflowRecord = { id: newId(), trigger, actions, armedAt: Date.now(), firedAt: null };
    commit([rec, ...read()]);
    return rec;
}

export function removeWorkflow(id: string): void {
    commit(read().filter((w) => w.id !== id));
}

export function markFired(id: string, slug?: string): void {
    commit(read().map((w) => (w.id === id ? { ...w, firedAt: Date.now(), ...(slug ? { firedSlug: slug } : {}) } : w)));
}

/** The human sentence for a record — built, never written (numbered house
 *  rule): "WHEN @x UPLOADS → MINT ×3 + NOTIFY". */
export function workflowSentence(w: WorkflowRecord): string {
    const acts: string[] = [];
    if (w.actions.qty) acts.push(`MINT ×${w.actions.qty}`);
    if (w.actions.todo) acts.push('TO-DO');
    acts.push('NOTIFY');
    const then = acts.join(' + ');
    if (w.trigger.kind === 'upload') return `WHEN @${w.trigger.artist} UPLOADS → ${then}`;
    const name = getProject(w.trigger.slug)?.displayName ?? w.trigger.slug.toUpperCase();
    const what = w.trigger.tokenId != null ? `${name} #${w.trigger.tokenId}` : name;
    return `WHEN ${what} ≤ ◊${w.trigger.priceEth} → ${then}`;
}
