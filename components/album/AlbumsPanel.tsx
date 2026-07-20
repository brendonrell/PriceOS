'use client';

/*
 * AlbumsPanel — THE Albums surface (profile ▸ +More ▸ Albums).
 *
 * Brendon's bar (2026-07-05): "#1 thing collectors will do while waiting.
 * Numbered only — no public writing. iOS-Photos simple on the surface,
 * super powerful underneath — like its own app, but visually the opposite."
 *
 * Surface: a covers grid (2×2 art mosaic per album, or the chosen cover) +
 * a NEW tile. Tap in → the album: a clean grid, tap a piece to open it.
 * Power (hidden until asked for):
 *   - SELECT mode → REMOVE · MOVE (to another album) · FRONT (reorder) ·
 *     COVER (single) ride a float bar; DELETE ALBUM lives here too.
 *   - A quiet live value line: how many members are listed + their sum,
 *     from the same real price feed the grail pins read.
 *   - ▶ THE SHOW — the album as a full-screen exhibition: live renders,
 *     slow crossfade, tap to leave. (Its "own app" moment.)
 * Albums are PRIVATE: other profiles see a quiet note, never contents.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmPlay, getFm } from '../../lib/fm/fmBus';
import OutputThumb from '../profile/OutputThumb';
import AlbumPickerCard from './AlbumPickerCard';
import { getProject } from '../../lib/project/registry';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { paintOutput } from '../../lib/state/ProjectContext';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { priceOf, useStarredPrices } from '../../lib/pins/starredPriceStore';
import {
    createAlbum,
    deleteAlbum,
    getAlbums,
    moveToFront,
    removeFromAlbum,
    setAlbumCover,
    subscribeAlbums,
} from '../../lib/pins/albumStore';
import type { AlbumRecord } from '../../lib/supabase';

const VS15 = '︎';

function parseKey(k: string): { slug: string; id: number } | null {
    const i = k.lastIndexOf(':');
    if (i <= 0) return null;
    const id = Number(k.slice(i + 1));
    if (!Number.isFinite(id)) return null;
    return { slug: k.slice(0, i), id };
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function fmtEth(n: number): string {
    return String(Number(n.toFixed(3)));
}

/* ── THE SHOW — full-screen exhibition of one album. ────────────────────── */
function AlbumShow({ album, number, onClose }: { album: AlbumRecord; number: number; onClose: () => void }) {
    const [idx, setIdx] = useState(0);
    const canvasA = useRef<HTMLCanvasElement | null>(null);
    const canvasB = useRef<HTMLCanvasElement | null>(null);
    const [front, setFront] = useState<'a' | 'b'>('a');
    const { notifs } = usePdNotifs();
    const ascii = notifs.asciiArt;
    const members = useMemo(
        () => album.keys.map(parseKey).filter((m): m is { slug: string; id: number } => !!m),
        [album.keys],
    );

    // Paint the next piece on the BACK canvas, then flip opacities (crossfade).
    useEffect(() => {
        const m = members[idx];
        if (!m) return;
        const back = (front === 'a' ? canvasB : canvasA).current;
        if (!back) return;
        const px = Math.min(1400, Math.max(640, window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)));
        let raf = 0;
        let cancelled = false;
        const flip = () => {
            if (cancelled) return;
            raf = requestAnimationFrame(() => setFront((f) => (f === 'a' ? 'b' : 'a')));
        };
        /* Images-only off the feature page (Brendon, 2026-07-07): The Show uses
           the stored preview, not a live render — no heavy engine on each slide. */
        const paintNormal = () => { try { paintOutput(back, m.slug, m.id, px); } catch { /* skip */ } };
        if (ascii) {
            /* ASCII Art Mode: the show exhibits the text backups. Flip only
               after the standin (or its fallback) has painted. */
            paintAsciiStandin(back, m.slug, m.id, px)
                .then((ok) => { if (!ok) paintNormal(); flip(); })
                .catch(() => { paintNormal(); flip(); });
        } else {
            paintNormal();
            flip();
        }
        return () => { cancelled = true; cancelAnimationFrame(raf); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, members, ascii]);

    // Auto-advance. Escape or tap leaves the show.
    useEffect(() => {
        if (members.length < 2) return;
        const t = window.setInterval(() => setIdx((i) => (i + 1) % members.length), 4500);
        return () => window.clearInterval(t);
    }, [members.length]);

    /* PDTV (2026-07-20 — the exhibition brief rides THE SHOW). Entering asks
       the platform for true fullscreen — a real ask on desktop/TV browsers;
       iPhone Safari offers no element fullscreen, and there the portal
       already fills the PWA viewport, which IS the iOS fullscreen. If the
       one player is silent, the show tunes the first exhibited project's
       soundtrack; a player already live is NEVER yanked (the house audio
       law), and leaving keeps the record spinning (nav never stops audio). */
    const showRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        try { void showRef.current?.requestFullscreen?.(); } catch { /* not offered here */ }
        if (getFm().status === 'idle') {
            for (const m of members) {
                const p = getProject(m.slug);
                if (p?.soundtrack) {
                    fmPlay({ playlistId: p.soundtrack.playlistId, label: p.soundtrack.label, slug: m.slug });
                    break;
                }
            }
        }
        return () => {
            try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* fine */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (members.length === 0) return null;
    const current = members[idx];
    return createPortal(
        <div ref={showRef} className="album-show" role="dialog" aria-label={`Album ${number} — full screen show`} onClick={onClose}>
            <canvas ref={canvasA} className={`album-show-art${front === 'a' ? ' front' : ''}`} />
            <canvas ref={canvasB} className={`album-show-art${front === 'b' ? ' front' : ''}`} />
            {/* The placard — gallery-wall label for the piece on show. */}
            <div className="album-show-caption">
                <span className="album-show-piece">{(getProject(current.slug)?.displayName ?? current.slug).toUpperCase()} #{current.id}</span>
                <span className="album-show-meta">ALBUM {pad2(number)} · {idx + 1}/{members.length}</span>
            </div>
        </div>,
        document.body,
    );
}

/* ── One cover tile: chosen cover, else a 2×2 mosaic of the first four.
      Wears its worth quietly: the sum of its currently-listed members.
      Sizing is 100% CSS (square tiles in an auto-fill grid — the sticker-grid
      system): the canvases paint at a fixed resolution and stretch to their
      cell, so nothing is ever measured or resized in JS.

      LIVING COVERS (2026-07-16 wow pass): a mosaic with more pieces than
      cells slowly drifts through its WHOLE membership — every few seconds
      one cell crossfades to a piece not currently showing, on a per-album
      stagger so the wall never blinks in unison. A chosen single cover
      stays perfectly still (it was chosen). ── */
function AlbumCoverTile({ album, number, listedEth, onOpen }: {
    album: AlbumRecord; number: number; listedEth: number; onOpen: () => void;
}) {
    const coverKey = album.cover && album.keys.includes(album.cover) ? album.cover : null;
    const [cells, setCells] = useState<string[]>(() => (coverKey ? [coverKey] : album.keys.slice(0, 4)));
    const keysSig = album.keys.join(',');
    useEffect(() => {
        setCells(coverKey ? [coverKey] : album.keys.slice(0, 4));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coverKey, keysSig]);
    useEffect(() => {
        if (coverKey || album.keys.length <= 4) return;
        const t = window.setInterval(() => {
            setCells((cur) => {
                const pool = album.keys.filter((k) => !cur.includes(k));
                if (pool.length === 0) return cur;
                const next = [...cur];
                next[Math.floor(Math.random() * next.length)] =
                    pool[Math.floor(Math.random() * pool.length)];
                return next;
            });
        }, 4200 + ((number - 1) % 5) * 750);
        return () => window.clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coverKey, keysSig, number]);
    return (
        <button
            type="button"
            className="album-tile"
            style={{ animationDelay: `${Math.min(number - 1, 8) * 55}ms` }}
            onClick={onOpen}
        >
            <span className={`album-tile-art${coverKey ? ' single' : ''}${cells.length === 0 ? ' empty' : ''}`}>
                {cells.map((k, i) => {
                    const m = parseKey(k);
                    // Key carries the CELL index + piece: a swapped cell
                    // remounts and runs the crossfade; still cells sit still.
                    return m ? (
                        <span key={`${i}-${k}`} className="album-cell">
                            <OutputThumb slug={m.slug} id={m.id} size={coverKey ? 170 : 85} crop />
                        </span>
                    ) : null;
                })}
                {!coverKey && cells.length === 0 && <span className="album-tile-empty">◰{VS15}</span>}
            </span>
            <span className="album-tile-label">
                <span className="album-tile-name">ALBUM {pad2(number)}</span>
                <span className="album-tile-count">
                    {listedEth > 0 && <span className="album-tile-worth"><span className="eth-mark">◊</span>{fmtEth(listedEth)} · </span>}
                    {album.keys.length}
                </span>
            </span>
        </button>
    );
}

export default function AlbumsPanel({ own }: { own: boolean }) {
    const { showToast } = useToast();
    const { open: openModal } = useModal();
    const [albums, setAlbums] = useState<ReadonlyArray<AlbumRecord>>(() => getAlbums());
    const [openId, setOpenId] = useState<string | null>(null);
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showOpen, setShowOpen] = useState(false);
    const [movePicker, setMovePicker] = useState(false);
    const [confirm, setConfirm] = useState<{ question: string; ok: string; onConfirm: () => void } | null>(null);

    useEffect(() => {
        setAlbums(getAlbums());
        return subscribeAlbums((next) => setAlbums(next));
    }, []);

    const openAlbum = albums.find((a) => a.id === openId) ?? null;
    const openNumber = openAlbum ? albums.findIndex((a) => a.id === openAlbum.id) + 1 : 0;

    // Leaving the album (or its members changing under a stale selection)
    // resets select-mode state.
    useEffect(() => { setSelecting(false); setSelected(new Set()); setShowOpen(false); }, [openId]);

    const members = useMemo(
        () => (openAlbum ? openAlbum.keys.map(parseKey).filter((m): m is { slug: string; id: number } => !!m) : []),
        [openAlbum],
    );

    // The quiet value lines — same live feed the grail pins read. Union of
    // EVERY album's projects so the covers wall can wear each album's worth.
    const slugs = useMemo(() => {
        const s = new Set<string>();
        for (const a of albums) for (const k of a.keys) { const m = parseKey(k); if (m) s.add(m.slug); }
        return Array.from(s);
    }, [albums]);
    const priceVersion = useStarredPrices(slugs);
    const albumWorth = useCallback((a: AlbumRecord): number => {
        let total = 0;
        for (const k of a.keys) {
            const m = parseKey(k);
            if (!m) continue;
            const p = priceOf(m.slug, m.id);
            if (p != null && p > 0) total += p;
        }
        return total;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceVersion]);
    const value = useMemo(() => {
        let listed = 0, total = 0;
        for (const m of members) {
            const p = priceOf(m.slug, m.id);
            if (p != null && p > 0) { listed++; total += p; }
        }
        return { listed, total };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [members, priceVersion]);

    if (!own) {
        return <p className="info-rubik album-private-note">Albums are private — only their keeper sees inside.</p>;
    }

    /* ── Covers grid ─────────────────────────────────────────────────────── */
    if (!openAlbum) {
        return (
            <div className="albums-wrap">
                {albums.length === 0 && (
                    <p className="album-empty-note">No albums yet — start your first.</p>
                )}
                {/* .albums-covers, NOT .albums-grid — that name belongs to the
                    project page's legacy albums tab and drags its padding in
                    (the 2026-07-16 buffer bug). */}
                <div className="albums-covers">
                    {albums.map((a, i) => (
                        <AlbumCoverTile key={a.id} album={a} number={i + 1} listedEth={albumWorth(a)} onOpen={() => setOpenId(a.id)} />
                    ))}
                    <button
                        type="button"
                        className="album-tile album-tile-new"
                        onClick={() => {
                            const rec = createAlbum();
                            showToast(`Album #${albums.length + 1}: CREATED`);
                            setOpenId(rec.id);
                        }}
                    >
                        <span className="album-tile-art album-tile-plus">＋</span>
                        <span className="album-tile-label"><span className="album-tile-name">NEW ALBUM</span></span>
                    </button>
                </div>
            </div>
        );
    }

    /* ── One album ───────────────────────────────────────────────────────── */
    const selKeys = Array.from(selected);

    const toggleSel = (k: string) => {
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(k)) n.delete(k); else n.add(k);
            return n;
        });
    };

    const doRemove = () => {
        setConfirm({
            question: `Remove ${selKeys.length} piece${selKeys.length === 1 ? '' : 's'} from Album #${openNumber}?`,
            ok: 'Remove',
            onConfirm: () => {
                const n = removeFromAlbum(openAlbum.id, selKeys) ?? 0;
                showToast(`Album #${openNumber}: REMOVED ${n}`);
                setSelected(new Set());
            },
        });
    };
    const doFront = () => {
        if (moveToFront(openAlbum.id, selKeys)) {
            showToast(`Album #${openNumber}: MOVED TO FRONT`);
            setSelected(new Set());
        }
    };
    const doCover = () => {
        if (selKeys.length === 1 && setAlbumCover(openAlbum.id, selKeys[0])) {
            showToast('Cover: SET');
            setSelected(new Set());
            setSelecting(false);
        }
    };
    const doDelete = () => {
        setConfirm({
            question: `Delete Album #${openNumber}? Its ${openAlbum.keys.length} piece${openAlbum.keys.length === 1 ? '' : 's'} stay yours.`,
            ok: 'Delete',
            onConfirm: () => {
                deleteAlbum(openAlbum.id);
                showToast(`Album #${openNumber}: DELETED`);
                setOpenId(null);
            },
        });
    };

    return (
        <div className="albums-wrap">
            <div className="album-head">
                <button type="button" className="album-back" onClick={() => setOpenId(null)}>‹ ALBUMS</button>
                <span className="album-title">ALBUM {pad2(openNumber)} · {openAlbum.keys.length}</span>
                <span className="album-head-actions">
                    {members.length > 0 && !selecting && (
                        <button type="button" className="album-head-btn" title="Play the album full screen" onClick={() => setShowOpen(true)}>
                            ▶{VS15}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`album-head-btn album-select-btn${selecting ? ' on' : ''}`}
                        onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }}
                    >
                        {selecting ? 'DONE' : 'SELECT'}
                    </button>
                </span>
            </div>

            {value.listed > 0 && (
                <div className="album-value-line">
                    {value.listed} LISTED · <span className="eth-mark">◊</span>{fmtEth(value.total)}
                </div>
            )}

            {members.length === 0 && (
                <p className="album-empty-note">Empty — add pieces from any artwork&rsquo;s ◰{VS15} or a multi-select bar.</p>
            )}

            <div className="album-pieces">
                {members.map((m, i) => {
                    const k = `${m.slug}:${m.id}`;
                    const isSel = selected.has(k);
                    return (
                        <button
                            key={k}
                            type="button"
                            className={`album-piece${isSel ? ' selected' : ''}`}
                            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                            onClick={() => (selecting ? toggleSel(k) : openModal('output', m.id, m.slug))}
                        >
                            <OutputThumb slug={m.slug} id={m.id} size={130} crop />
                            {selecting && <span className="album-check">{isSel ? '▣' : '❐'}{VS15}</span>}
                        </button>
                    );
                })}
            </div>

            {selecting && (
                <div className="album-tools">
                    <button type="button" className="album-tool" disabled={selKeys.length === 0} onClick={doRemove}>REMOVE</button>
                    <button type="button" className="album-tool" disabled={selKeys.length === 0} onClick={() => setMovePicker(true)}>MOVE</button>
                    <button type="button" className="album-tool" disabled={selKeys.length === 0} onClick={doFront}>FRONT</button>
                    <button type="button" className="album-tool" disabled={selKeys.length !== 1} onClick={doCover}>COVER</button>
                    <button type="button" className="album-tool album-tool-danger" onClick={doDelete}>DELETE ALBUM</button>
                </div>
            )}

            {showOpen && <AlbumShow album={openAlbum} number={openNumber} onClose={() => setShowOpen(false)} />}

            {movePicker && (
                <AlbumPickerCard
                    items={selKeys.map(parseKey).filter((m): m is { slug: string; id: number } => !!m)}
                    onDone={(msg) => {
                        // MOVE = add to the picked album, then leave this one.
                        removeFromAlbum(openAlbum.id, selKeys);
                        setMovePicker(false);
                        setSelected(new Set());
                        showToast(msg.replace('ADDED', 'MOVED'));
                    }}
                    onClose={() => setMovePicker(false)}
                />
            )}

            {confirm && (
                <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirm(null)}>
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">{confirm.question}</div>
                        <div className="ms-confirm-btns">
                            <button className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirm(null)}>Cancel</button>
                            <button className="ms-confirm-btn ms-confirm-btn--ok" onClick={() => { confirm.onConfirm(); setConfirm(null); }}>{confirm.ok}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
