'use client';

/*
 * ListsPanel — MY LISTS, on the Starred surface (Brendon, 2026-07-24).
 *
 * Opened by the MY LISTS button in Starred's sort row (beside ◷ Recent) and
 * closed by the same button — default OFF, nothing auto-opens.
 *
 * Shape, per Brendon: lists run ALPHABETICALLY, each one COLLAPSIBLE, and the
 * rows inside are SHORTER than a Starred row — thumbnail plus the relevant
 * info, nothing else. So the piece art still leads (it's what you recognise),
 * the id line stays, and the second line carries only what actually helps you
 * pick: the live price when it's listed, otherwise the piece's Fate.
 *
 * Reuse, not reinvention (Rule #0): the thumbnail is OutputThumb — the same
 * component the Starred / Wishlist / History rows use — the row skeleton is the
 * starred-row anatomy with a compact modifier, and tapping a row opens the
 * artwork modal exactly as a Starred row does.
 *
 * Empty lists still render their header: a list you made and haven't filled is
 * information, and it's the only place you can see it exists.
 */

import { useEffect, useMemo, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { getProject } from '../../lib/project/registry';
import { readOutputFate } from '../../lib/project/fate';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import OutputThumb from '../profile/OutputThumb';
import { getLists, subscribeLists, removeFromList } from '../../lib/pins/listStore';
import type { ListRecord } from '../../lib/supabase';

const VS15 = '︎';

/** One member of a list, parsed out of its `${slug}:${id}` key. */
interface ListItem { slug: string; id: number; key: string }

function parseKeys(keys: ReadonlyArray<string>): ListItem[] {
    const out: ListItem[] = [];
    for (const k of keys) {
        const i = k.indexOf(':');
        if (i < 0) continue;
        const slug = k.slice(0, i);
        const id = Number(k.slice(i + 1));
        // Drop members whose Project has left the registry — same guard the
        // Starred rows use, so a dead key never paints a broken row.
        if (!Number.isFinite(id) || !getProject(slug)) continue;
        out.push({ slug, id, key: k });
    }
    return out;
}

/* ── One SHORT row: thumb · project #id · the one line that matters ── */
function ListRow({ item, onRemove }: { item: ListItem; onRemove: () => void }) {
    const { open } = useModal();
    const meta = useOutputMeta(item.id);
    const project = getProject(item.slug);
    /* The relevant info, in priority order: what it costs if you can buy it,
       otherwise its Fate — the same two facts a Starred row leads with. */
    const info = meta?.price != null
        ? meta.price
        : readOutputFate(item.slug, item.id).fate;

    return (
        <div
            className="starred-row lists-row"
            role="button"
            tabIndex={0}
            data-slug={item.slug}
            data-mint-id={item.id}
            onClick={() => open('output', item.id, item.slug)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('output', item.id, item.slug); }
            }}
        >
            <OutputThumb slug={item.slug} id={item.id} size={40} crop />
            <div className="starred-row-meta">
                <span className="starred-row-id is-split">
                    <span className="srl-handle">{project?.displayName ?? item.slug}</span>
                    <span className="srl-suffix">#{item.id}</span>
                </span>
                <span className="starred-row-sub">{info}</span>
            </div>
            <span
                className="starred-row-unstar"
                role="button"
                tabIndex={0}
                title="Remove from this list"
                aria-label="Remove from this list"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onRemove(); }
                }}
            >
                {`✕${VS15}`}
            </span>
        </div>
    );
}

/* ── One collapsible list ── */
function ListSection({ list, onToast }: { list: ListRecord; onToast: (m: string) => void }) {
    /* Collapsed by default — the point of the panel is to scan your list NAMES
       first and open the one you want (Brendon: collapsible). */
    const [open, setOpen] = useState(false);
    const items = useMemo(() => parseKeys(list.keys), [list.keys]);

    return (
        <div className={`lists-section${open ? ' is-open' : ''}`}>
            <div
                className="lists-head"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
            >
                <span className="lists-head-caret" aria-hidden="true">{open ? `▾${VS15}` : `▸${VS15}`}</span>
                <span className="lists-head-name">{list.name}</span>
                <span className="lists-head-count">{items.length}</span>
            </div>
            {open && (
                items.length === 0 ? (
                    <div className="lists-empty">Nothing in here yet.</div>
                ) : (
                    <div className="lists-rows">
                        {items.map((it) => (
                            /* Each row paints its own Project's art, so it needs
                               that Project's context — same wrap the Starred
                               rows use for mixed-project lists. */
                            <ProjectProvider key={it.key} slug={it.slug}>
                                <ListRow
                                    item={it}
                                    onRemove={() => {
                                        removeFromList(list.id, [it.key]);
                                        onToast(`${list.name}: REMOVED`);
                                    }}
                                />
                            </ProjectProvider>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default function ListsPanel({ onToast }: { onToast: (m: string) => void }) {
    const [lists, setLists] = useState<ReadonlyArray<ListRecord>>(() => getLists());
    useEffect(() => {
        setLists(getLists());
        return subscribeLists(setLists);
    }, []);

    /* ALPHABETICAL (Brendon) — by name, case-insensitively, so "aurora" and
       "Aurora" sort where a reader expects rather than by byte value. */
    const ordered = useMemo(
        () => [...lists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
        [lists],
    );

    if (ordered.length === 0) {
        return (
            <section className="starred-list lists-panel" aria-label="My Lists">
                <div className="lists-empty">
                    No lists yet — use ADD TO LIST on any starred piece to make your first.
                </div>
            </section>
        );
    }

    return (
        <section className="starred-list lists-panel" aria-label="My Lists">
            {ordered.map((l) => (
                <ListSection key={l.id} list={l} onToast={onToast} />
            ))}
        </section>
    );
}
