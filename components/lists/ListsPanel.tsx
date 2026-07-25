'use client';

/*
 * ListsPanel — MY LISTS, on the Starred surface (Brendon, 2026-07-24).
 *
 * Opened by the LISTS button that closes Starred's sort row; tapping any other
 * sort is the way back out. Default OFF, nothing auto-opens.
 *
 * Shape, per Brendon: lists run ALPHABETICALLY, each one COLLAPSIBLE, and the
 * rows inside are SHORTER than a Starred row — thumbnail plus the relevant
 * info, nothing else. So the piece art still leads (it's what you recognise),
 * the id line stays, and an artwork's second line carries the ARTIST's @name
 * plus ONE number: its live ASK when it's listed, otherwise its PD RARITY
 * (Brendon, 2026-07-25 — it used to fall back to the piece's Fate, which just
 * read as a stray trait).
 *
 * A list holds ANY starred kind (2026-07-25 — All Starred's row CTA is Add to
 * List on every row), so the panel draws a short row per kind: the Output keeps
 * its thumbnail, and Projects / Traits / Artists / Soundtracks / Transactions
 * wear the SAME tile + glyph their Starred rows do, shrunk to the short row.
 *
 * Reuse, not reinvention (Rule #0): the thumbnail is OutputThumb — the same
 * component the Starred / Wishlist / History rows use — the row skeleton is the
 * starred-row anatomy with a compact modifier, the tiles and glyphs are the
 * Starred rows' own, and tapping a row goes exactly where its Starred row goes.
 *
 * Empty lists still render their header: a list you made and haven't filled is
 * information, and it's the only place you can see it exists.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStarLongPress } from '../../lib/hooks/rowFlags';
import { useListRowDrag, ROW_KEY_ATTR } from '../../lib/hooks/useListRowDrag';
import { useModal } from '../../lib/state/ModalContext';
import { useLocalStorage } from '../../lib/hooks/useLocalStorage';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { getProject, projectColorway, projectsByArtist } from '../../lib/project/registry';
import { pdRarity } from '../../lib/output/rarity';
import { traitMarketStat, projectMarketStat, artistColor, artistFloor, collectorTopBuy } from '../../lib/market/starredMarket';
import { useStarredPrices, priceOf, isHeldBy } from '../../lib/pins/starredPriceStore';
import { getTxStarItems } from '../../lib/pins/txStarStore';
import { txStarToFeedEvent, FeedActorLine } from '../../lib/feed/feedRow';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import OutputThumb from '../profile/OutputThumb';
import {
    getLists, subscribeLists, removeFromList, parseListKey, moveInList,
    renameList, deleteList, LIST_NAME_MAX, type ListMemberRef,
} from '../../lib/pins/listStore';
import type { ListRecord } from '../../lib/supabase';

const VS15 = '︎';

/* The ◊ money control, mirroring the Portfolio's $-button (Brendon, 2026-06-25
   → Lists, 2026-07-25): a CYCLE that includes an OFF state, persisted, with the
   toast naming the new mode. OFF hides every number and puts ❖ rarity back on
   the rows — the ◊ itself stays put so there's always something to tap to
   bring the money back. */
export type ListPriceMode = 'secondary' | 'primary' | 'off';
const PRICE_MODES: ListPriceMode[] = ['secondary', 'primary', 'off'];
const PRICE_MODE_LABEL: Record<ListPriceMode, string> = {
    secondary: 'SECONDARY',
    primary: 'PRIMARY',
    off: 'OFF',
};

function parseKeys(keys: ReadonlyArray<string>): ListMemberRef[] {
    const out: ListMemberRef[] = [];
    for (const k of keys) {
        const ref = parseListKey(k);
        if (!ref) continue;
        // Drop members whose Project has left the registry — the same guard the
        // Starred rows use, so a dead key never paints a broken row. A person
        // and a transaction aren't Project-bound, so they skip the check.
        if (ref.kind !== 'artist' && ref.kind !== 'tx' && !getProject(ref.slug)) continue;
        out.push(ref);
    }
    return out;
}

/* The remove ✕ every short row carries, on the right. */
function RemoveX({ onRemove }: { onRemove: () => void }) {
    return (
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
    );
}

/* ── One SHORT row: thumb · project #id · the one line that matters ──
   `full` is the FOCUSED reading of a list (long-pressed): the same row at the
   Starred rows' own size, with the artist line the short row drops. */
function ListRow({ item, owned, full, priceMode, dragProps, onRemove }: {
    item: Extract<ListMemberRef, { kind: 'output' }>;
    /** The viewer holds this piece — marked with the same ✓ the picker uses. */
    owned: boolean;
    full: boolean;
    /** The panel's ◊ money mode — OFF puts rarity back on every row. */
    priceMode: ListPriceMode;
    /** Hold-to-drag reorder wiring for this row. */
    dragProps: Record<string, unknown>;
    onRemove: () => void;
}) {
    const { open } = useModal();
    const meta = useOutputMeta(item.id);
    const project = getProject(item.slug);
    /* The one info line a short row has (Brendon, 2026-07-25). It used to fall
       back to the piece's Fate, which reads as a stray trait word and tells you
       nothing about what you're scanning. Now: the ARTIST's @name always, then
       ONE number on the right, and the header's ◊ control decides which —
         · SECONDARY → the live ASKING PRICE (a real ask beats any static read),
         · PRIMARY   → what the piece minted for,
         · OFF       → its PD RARITY, the same 0–100 the character sheet and the
                       Vault lead with, wearing the canonical ❖.
       With money ON but no number to show (an unlisted piece, a free mint), the
       row falls back to rarity rather than going blank.
       The @name takes the room first; rarity is what gives way when there isn't
       any (see .lists-row-rarity). */
    const artist = project?.artistHandle ? `@${project.artistHandle}` : null;
    const rarity = useMemo(() => pdRarity(item.slug, item.id)?.score ?? null, [item.slug, item.id]);
    const money = priceMode === 'secondary'
        ? (meta?.price ?? null)
        : priceMode === 'primary'
            ? (project?.mintPriceEth ? `${project.mintPriceEth} ETH` : null)
            : null;

    return (
        <div
            className={`starred-row${full ? '' : ' lists-row'}`}
            role="button"
            tabIndex={0}
            data-slug={item.slug}
            data-mint-id={item.id}
            {...{ [ROW_KEY_ATTR]: item.key }}
            {...dragProps}
            onClick={() => open('output', item.id, item.slug)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('output', item.id, item.slug); }
            }}
        >
            <OutputThumb slug={item.slug} id={item.id} size={full ? 64 : 40} crop />
            <div className="starred-row-meta">
                <span className="starred-row-id is-split">
                    {owned && (
                        <span className="lists-owned" title="You own this" aria-label="You own this">{`✓${VS15}`}</span>
                    )}
                    <span className="srl-handle">{project?.displayName ?? item.slug}</span>
                    <span className="srl-suffix">#{item.id}</span>
                </span>
                <span className="starred-row-sub lists-row-info">
                    <span className="lists-row-artist">{artist ?? ' '}</span>
                    {money != null ? (
                        <span
                            className="lists-row-rarity lists-row-ask"
                            title={priceMode === 'primary' ? `Minted at ${money}` : `Asking ${money}`}
                        >
                            {money}
                        </span>
                    ) : rarity != null ? (
                        <span className="lists-row-rarity" title={`PD Rarity ${rarity}`}>
                            {`❖${VS15}`}{rarity}
                        </span>
                    ) : null}
                </span>
            </div>
            <RemoveX onRemove={onRemove} />
        </div>
    );
}

/* ── The non-Output short rows — the Starred tile + glyph, shrunk ── */
function TileRow({
    glyph, glyphClass, color, title, info, full, memberKey, dragProps, onOpen, onRemove,
}: {
    glyph: string;
    glyphClass?: string;
    color?: string;
    title: React.ReactNode;
    info: React.ReactNode;
    full: boolean;
    memberKey: string;
    dragProps: Record<string, unknown>;
    onOpen?: () => void;
    onRemove: () => void;
}) {
    return (
        <div
            className={`starred-row${full ? '' : ' lists-row'}`}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            {...{ [ROW_KEY_ATTR]: memberKey }}
            {...dragProps}
            onClick={onOpen}
            onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
        >
            <div className="trait-row-tile artist-tile">
                <span className={`artist-row-tile-glyph${glyphClass ? ' ' + glyphClass : ''}`} style={color ? { color } : undefined}>
                    {glyph}{VS15}
                </span>
            </div>
            <div className="starred-row-meta">
                <span className="starred-row-id">{title}</span>
                <span className="starred-row-sub">{info}</span>
            </div>
            <RemoveX onRemove={onRemove} />
        </div>
    );
}

/* One member of any kind — routed to the row that draws it. */
function MemberRow({ member: m, viewerAddress, full, priceMode, dragProps, onRemove }: {
    member: ListMemberRef;
    viewerAddress?: string | null;
    /** Focused reading — rows at the Starred rows' own size. */
    full: boolean;
    priceMode: ListPriceMode;
    dragProps: Record<string, unknown>;
    onRemove: () => void;
}) {
    const router = useRouter();

    if (m.kind === 'output') {
        return <ListRow item={m} owned={isHeldBy(m.slug, m.id, viewerAddress)} full={full} priceMode={priceMode} dragProps={dragProps} onRemove={onRemove} />;
    }

    if (m.kind === 'project') {
        const stat = projectMarketStat(m.slug);
        return (
            <TileRow
                glyph="⬚"
                color={projectColorway(m.slug) ?? undefined}
                title={`@${m.slug}`}
                info={<>Floor:<em>{stat.floor}</em></>}
                onOpen={() => router.push('/art/' + m.slug)}
                full={full}
                memberKey={m.key}
                dragProps={dragProps}
                onRemove={onRemove}
            />
        );
    }

    if (m.kind === 'trait') {
        const stat = traitMarketStat(m.slug, m.category, m.value);
        return (
            <TileRow
                glyph="⨝"
                glyphClass="trait-row-tile-glyph"
                color={projectColorway(m.slug) ?? undefined}
                title={`@${m.slug} · ${m.category}: ${m.value}`}
                info={<>Floor:<em>{stat.floor}</em></>}
                full={full}
                memberKey={m.key}
                dragProps={dragProps}
                onRemove={onRemove}
            />
        );
    }

    if (m.kind === 'artist') {
        /* Artist vs collector is the same split Starred uses: a handle with at
           least one project is an artist, everyone else is a collector. */
        const handle = m.slug.replace(/^@/, '');
        const isArtist = projectsByArtist(handle).length > 0;
        return (
            <TileRow
                glyph={isArtist ? '✺' : '☻'}
                color={artistColor(handle)}
                title={`@${handle}`}
                info={isArtist
                    ? <>Floor:<em>{artistFloor(handle) ?? '—'}</em></>
                    : <>Top buy:<em>{collectorTopBuy(handle)}</em></>}
                onOpen={() => router.push('/' + handle)}
                full={full}
                memberKey={m.key}
                dragProps={dragProps}
                onRemove={onRemove}
            />
        );
    }

    if (m.kind === 'soundtrack') {
        const label = getProject(m.slug)?.soundtrack?.label ?? m.playlistId;
        return (
            <TileRow
                glyph="▶"
                glyphClass="soundtrack-tile-glyph"
                color={projectColorway(m.slug) ?? undefined}
                title={`@${m.slug}`}
                info={<>{`♫${VS15} `}<em>{label}</em></>}
                full={full}
                memberKey={m.key}
                dragProps={dragProps}
                onRemove={onRemove}
            />
        );
    }

    // Transaction — resolved live off the starred-tx store by its event id.
    const star = getTxStarItems().find((s) => s.id === m.txId);
    if (!star) return null;
    const fe = txStarToFeedEvent(star);
    return (
        <TileRow
            glyph={fe.icon}
            color={(star.type === 'MINT' || star.type === 'SALE' ? star.toHandle : star.fromHandle)
                ? artistColor(((star.type === 'MINT' || star.type === 'SALE' ? star.toHandle : star.fromHandle) as string).replace(/^@/, ''))
                : undefined}
            title={<FeedActorLine fe={fe} />}
            info={`${fe.type} · ${fe.time}`}
            full={full}
            memberKey={m.key}
            dragProps={dragProps}
            onRemove={onRemove}
        />
    );
}

/* ── One collapsible list ── */
function ListSection({ list, viewerAddress, priceMode, pricesVer, focused, onToggleFocus, onCycleTotal, onToast, onAskDelete }: {
    list: ListRecord;
    viewerAddress?: string | null;
    /** Which money the ◊ shows — or OFF. See ListsPanel. */
    priceMode: ListPriceMode;
    /** Bumps when the price/owner feed lands, so the totals recompute. */
    pricesVer: number;
    /** This list has the panel to itself, its rows at full Starred size. */
    focused: boolean;
    onToggleFocus: () => void;
    onCycleTotal: () => void;
    onToast: (m: string) => void;
    onAskDelete: () => void;
}) {
    /* Collapsed by default — the point of the panel is to scan your list NAMES
       first and open the one you want (Brendon: collapsible). */
    const [open, setOpen] = useState(false);
    /* FOCUS — long-press the name to give this list the panel to itself and
       read it at full Starred size; long-press the SAME name to let go
       (Brendon, 2026-07-25: "longpress way out is always longpress again same
       spot"). Reuses the app's own hold gesture, the one the feed's star rows
       use, so a scroll-drag cancels it exactly as it does everywhere else. */
    const lp = useStarLongPress(() => {
        onToggleFocus();
        return !focused;
    });
    /* Focusing a list opens it — a focused list you can't see is nothing. */
    useEffect(() => { if (focused) setOpen(true); }, [focused]);

    /* DRAG TO REORDER — hold a row and drop it on another; members render in
       stored order, so this IS the order you read (Brendon, 2026-07-25). */
    const { rowHandlers } = useListRowDrag((fromKey, ontoKey) => {
        if (moveInList(list.id, fromKey, ontoKey)) onToast(`${list.name}: REORDERED`);
    });
    /* Rename in place: the ✎ swaps the name for an input, Enter/blur commits,
       Esc backs out. Same pencil the budget pills use (Brendon, 2026-07-24). */
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(list.name);
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editing) { setDraft(list.name); } }, [editing, list.name]);
    useEffect(() => { if (editing) nameRef.current?.focus(); }, [editing]);

    const commitRename = () => {
        const next = draft.trim();
        setEditing(false);
        if (!next || next === list.name) return;
        if (renameList(list.id, next)) onToast(`List: RENAMED`);
    };

    const items = useMemo(() => parseKeys(list.keys), [list.keys]);

    /* The two numbers a list header carries beside its count.
       OWNED — how many of the artworks in here you already hold. Only artworks
       can be owned, so a list of projects/people simply doesn't show it.
       ◊ TOTAL — SECONDARY counts what the listed pieces are asking right now
       (what finishing this list would cost today); PRIMARY counts what they
       minted for. Both count ARTWORKS ONLY: a trait or an artist has no single
       price, and summing them would be a lie. */
    const { owned, ownable, total } = useMemo(() => {
        let ownedN = 0;
        let ownableN = 0;
        let sum = 0;
        for (const it of items) {
            if (it.kind !== 'output') continue;
            ownableN++;
            if (isHeldBy(it.slug, it.id, viewerAddress)) ownedN++;
            if (priceMode === 'secondary') {
                const p = priceOf(it.slug, it.id);
                if (p != null) sum += p;
            } else if (priceMode === 'primary') {
                sum += getProject(it.slug)?.mintPriceEth ?? 0;
            }
        }
        return { owned: ownedN, ownable: ownableN, total: sum };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, viewerAddress, priceMode, pricesVer]);

    return (
        <div className={`lists-section${open ? ' is-open' : ''}${focused ? ' is-focused' : ''}`}>
            <div
                className="lists-head"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
                /* The hold fired the focus toggle — swallow the tap it rides in
                   on, or the header would also collapse (the same guard the
                   Starred rows use). */
                onClick={() => {
                    if (lp.longFired.current) { lp.longFired.current = false; return; }
                    if (!editing) setOpen((v) => !v);
                }}
                onKeyDown={(e) => {
                    if (editing) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
                }}
                {...(editing ? {} : lp.handlers)}
            >
                <span className="lists-head-caret" aria-hidden="true">{open ? `▾${VS15}` : `▸${VS15}`}</span>
                {editing ? (
                    <input
                        ref={nameRef}
                        className="value-prompt-input lists-head-input"
                        value={draft}
                        maxLength={LIST_NAME_MAX}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                            if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
                        }}
                    />
                ) : (
                    <span className="lists-head-name">{list.name}</span>
                )}
                <span className="lists-head-count">{items.length}</span>
                {/* How many of this list's artworks you already hold. */}
                {ownable > 0 && (
                    <span className="lists-head-owned" title={`You own ${owned} of ${ownable}`}>
                        {`✓${VS15}`}{owned}/{ownable}
                    </span>
                )}
                {/* ◊ is PD's ETH mark, and the panel's money control. It stays
                    put in every mode — including OFF, where it shows the mark
                    alone — so the way back to the numbers is always one tap on
                    the same spot. */}
                {ownable > 0 && (
                    <span
                        className={`lists-head-total${priceMode === 'off' ? ' is-off' : ''}`}
                        role="button"
                        tabIndex={0}
                        title={`Prices: ${PRICE_MODE_LABEL[priceMode]} — tap to cycle`}
                        onClick={(e) => { e.stopPropagation(); onCycleTotal(); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onCycleTotal(); }
                        }}
                    >
                        {`◊${VS15}`}{priceMode !== 'off' && total > 0 ? total.toFixed(total >= 100 ? 0 : 2) : ''}
                    </span>
                )}
                {/* Rename — the budget pills' pencil, same glyph. */}
                <span
                    className="lists-head-edit"
                    role="button"
                    tabIndex={0}
                    title="Rename list"
                    aria-label="Rename list"
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setEditing(true); }
                    }}
                >{'\u270e\ufe0e'}</span>
                {/* Delete — asks first, through the app's remove-confirm card. */}
                <span
                    className="lists-head-delete"
                    role="button"
                    tabIndex={0}
                    title="Delete list"
                    aria-label="Delete list"
                    onClick={(e) => { e.stopPropagation(); onAskDelete(); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onAskDelete(); }
                    }}
                >{`×${VS15}`}</span>
            </div>
            {open && (
                items.length === 0 ? (
                    <div className="lists-empty">Nothing in here yet.</div>
                ) : (
                    <div className="lists-rows">
                        {items.map((it) => {
                            const row = (
                                <MemberRow
                                    member={it}
                                    viewerAddress={viewerAddress}
                                    full={focused}
                                    priceMode={priceMode}
                                    dragProps={rowHandlers(it.key)}
                                    onRemove={() => {
                                        removeFromList(list.id, [it.key]);
                                        onToast(`${list.name}: REMOVED`);
                                    }}
                                />
                            );
                            /* An Output row paints its own Project's art, so it
                               needs that Project's context — same wrap the
                               Starred rows use for mixed-project lists. */
                            return it.kind === 'output'
                                ? <ProjectProvider key={it.key} slug={it.slug}>{row}</ProjectProvider>
                                : <Fragment key={it.key}>{row}</Fragment>;
                        })}
                    </div>
                )
            )}
        </div>
    );
}

export default function ListsPanel({ onToast, dir = 'asc', viewerAddress }: {
    onToast: (m: string) => void;
    /** Which way the names run — flipped by tapping ≡ LISTS again. */
    dir?: 'asc' | 'desc';
    /** The signed-in wallet — drives the owned ✓ and the n/m roll-up. */
    viewerAddress?: string | null;
}) {
    const [lists, setLists] = useState<ReadonlyArray<ListRecord>>(() => getLists());
    useEffect(() => {
        setLists(getLists());
        return subscribeLists(setLists);
    }, []);

    /* Prices + ownership for every artwork in every list, from the one feed
       that already carries both (Rule #0 — the Starred sort uses the same
       store). Fetched per project, cached, so a collapsed list costs nothing
       extra to total. */
    const memberSlugs = useMemo(() => {
        const s = new Set<string>();
        for (const l of lists) {
            for (const k of l.keys) {
                const ref = parseListKey(k);
                if (ref?.kind === 'output') s.add(ref.slug);
            }
        }
        return [...s];
    }, [lists]);
    const pricesVer = useStarredPrices(memberSlugs);

    /* One mode for the whole panel, so two headers can never disagree about
       which money they're showing. Tapping any ◊ flips them all; the toast
       names the mode (§9 casing — the STATE screams). */
    /* FOCUS — long-press a list's name and it takes the panel to itself, read
       at full Starred size; long-press that same name to let go (Brendon,
       2026-07-25). No new chrome: the way in and the way out are one gesture on
       one spot, and the header never moves. */
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const toggleFocus = (id: string, name: string) => {
        setFocusedId((cur) => {
            const next = cur === id ? null : id;
            // §9 casing — the label stays normal case, the STATE screams.
            onToast(next ? `${name}: FOCUSED` : `${name}: RELEASED`);
            return next;
        });
    };

    /* One mode for the whole panel, so two headers can never disagree about
       which money they're showing, and PERSISTED — the Portfolio's $-button
       remembers its mode and this is the same control (Rule #0). Tapping any ◊
       advances every header AND every row; the toast names the mode (§9 casing
       — the STATE screams). */
    const [priceMode, setPriceMode] = useLocalStorage<ListPriceMode>('pd_lists_price_mode', 'secondary');
    const cycleTotal = () => {
        const idx = PRICE_MODES.indexOf(priceMode);
        const next = PRICE_MODES[(idx + 1) % PRICE_MODES.length];
        setPriceMode(next);
        onToast(`List prices: ${PRICE_MODE_LABEL[next]}`);
    };

    /* Deleting a list asks first, through the app's own remove-confirm card —
       the same one the Starred rows use for their ✕ (Rule #0). */
    const [confirm, setConfirm] = useState<ListRecord | null>(null);
    const confirmCard = confirm ? (
        <div
            className="starred-confirm-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setConfirm(null)}
        >
            <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                {/* The pieces survive — only the grouping goes. Say so, so
                    nobody hesitates over losing their stars. */}
                <div className="ms-confirm-question">
                    Delete the list “{confirm.name}”? The pieces stay in your Starred.
                </div>
                <div className="ms-confirm-btns">
                    <button
                        className="ms-confirm-btn ms-confirm-btn--cancel"
                        onClick={() => setConfirm(null)}
                    >
                        Cancel
                    </button>
                    <button
                        className="ms-confirm-btn ms-confirm-btn--ok"
                        onClick={() => {
                            const name = confirm.name;
                            if (deleteList(confirm.id)) onToast(`${name}: DELETED`);
                            setConfirm(null);
                        }}
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    /* ALPHABETICAL (Brendon) — by name, case-insensitively, so "aurora" and
       "Aurora" sort where a reader expects rather than by byte value. Tapping
       ≡ LISTS again flips it, exactly like the sorts beside it. */
    const ordered = useMemo(() => {
        const sorted = [...lists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const byDir = dir === 'desc' ? sorted.reverse() : sorted;
        /* A focused list has the panel to itself — the others stand down until
           the same long-press releases it. */
        const only = byDir.find((l) => l.id === focusedId);
        return only ? [only] : byDir;
    }, [lists, dir, focusedId]);

    /* A list deleted while focused would strand the panel showing nothing. */
    useEffect(() => {
        if (focusedId && !lists.some((l) => l.id === focusedId)) setFocusedId(null);
    }, [lists, focusedId]);

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
                <ListSection
                    /* pricesVer in the key would remount and collapse open
                       sections — the totals read it through the memo instead. */
                    key={l.id}
                    list={l}
                    viewerAddress={viewerAddress}
                    priceMode={priceMode}
                    pricesVer={pricesVer}
                    focused={focusedId === l.id}
                    onToggleFocus={() => toggleFocus(l.id, l.name)}
                    onCycleTotal={cycleTotal}
                    onToast={onToast}
                    onAskDelete={() => setConfirm(l)}
                />
            ))}
            {confirmCard}
        </section>
    );
}
