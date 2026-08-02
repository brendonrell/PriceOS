'use client';

/*
 * ColorpediaModal ◉ — the little book about one colour.
 *
 * Door IN: the Colorway tile on a Project's Attributes tab (payload = the hex).
 * Door OUT: the ×, a tap outside, or Esc — and NOTHING else. Searching, tapping
 * a result, copying a format, walking a harmony: every one of those keeps the
 * card open and updates it under your finger (CLAUDE.md Rule #-0.55). The body
 * is the single scroll area, so the whole card is reachable on an iPhone.
 *
 * Every NUMBER is computed live from the colour (lib/color/convert) — exact for
 * any colour at all. Every NAME and every piece of history is looked up in the
 * fixed, baked vocabulary (lib/color/vocabulary). Nothing is generated at
 * runtime, so nothing can be invented in front of a user.
 *
 * A colour that is not in the vocabulary snaps to its nearest neighbour, and the
 * card SAYS SO — the name line carries the distance so a snapped colour never
 * passes off a neighbour's story as its own.
 *
 * Rides the same shell as the Clubhouse and the Friend Inspector
 * (sticker-mgr-backdrop + ambient-pop + followers-pop) so it reads as family.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import { useToastSend } from '../lib/state/ToastContext';
import {
    normalizeHex, hexToRgb, rgbToHsl, rgbToHsv, rgbToCmyk, rgbToLab, labToLch,
    relativeLuminance, contrastRatio, readableInk, hueFamily, temperatureWord,
    valueWord, chromaWord, harmonies,
    formatRgb, formatHsl, formatHsv, formatCmyk, formatLab, formatLch,
} from '../lib/color/convert';
import { readColor, searchColors, neighbours, matchWord } from '../lib/color/colorpedia';

const VS15 = '︎';
const FALLBACK = '#808080';

export default function ColorpediaModal() {
    const { stack, close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('colorpedia');
    const showToast = useToastSend();

    /* The colour the card is currently reading. Seeded from the payload the
       door passes in; walking a harmony or a neighbour re-points it WITHOUT
       closing or re-opening anything. Read off OUR OWN stack entry, so a modal
       opening on top of this one can never re-seed the card underneath. */
    const payload = useMemo(() => {
        const mine = stack.find((m) => m.name === 'colorpedia');
        return typeof mine?.payload === 'string' ? mine.payload : null;
    }, [stack]);
    const [hex, setHex] = useState<string>(FALLBACK);
    const [query, setQuery] = useState('');

    /* Re-seed on each open (and whenever the door hands over a new colour). */
    useEffect(() => {
        if (!isOpen) return;
        setHex(normalizeHex(payload ?? '') ?? FALLBACK);
        setQuery('');
    }, [isOpen, payload]);

    useEffect(() => {
        if (!isOpen) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    const reading = useMemo(() => readColor(hex), [hex]);
    const search = useMemo(() => (query.trim() ? searchColors(query) : null), [query]);
    const kin = useMemo(() => neighbours(hex, 7).filter((n) => !n.exact).slice(0, 6), [hex]);
    const chords = useMemo(() => harmonies(hex), [hex]);

    const rgb = useMemo(() => hexToRgb(hex), [hex]);
    const ink = readableInk(rgb);
    const lab = rgbToLab(rgb);
    const onWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
    const onBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 });

    /* Copy keeps the card open — it is an action INSIDE the modal, never a
       reason to dismiss it. The thing that changed wears the ALLCAPS. */
    const copy = (label: string, value: string) => {
        navigator.clipboard?.writeText(value).catch(() => {});
        showToast(`${label}: COPIED`);
    };

    /* Walking to another colour: the card re-reads in place and the search
       field empties so the detail is what you see. It does NOT close. */
    const goTo = (next: string) => {
        const norm = normalizeHex(next);
        if (!norm) return;
        setHex(norm);
        setQuery('');
    };

    if (!isOpen || typeof document === 'undefined') return null;

    const FORMATS: { key: string; label: string; value: string }[] = [
        { key: 'hex', label: 'HEX', value: hex },
        { key: 'rgb', label: 'RGB', value: formatRgb(rgb) },
        { key: 'hsl', label: 'HSL', value: formatHsl(rgbToHsl(rgb)) },
        { key: 'hsv', label: 'HSV', value: formatHsv(rgbToHsv(rgb)) },
        { key: 'cmyk', label: 'CMYK', value: formatCmyk(rgbToCmyk(rgb)) },
        { key: 'lab', label: 'LAB', value: formatLab(lab) },
        { key: 'lch', label: 'LCH', value: formatLch(labToLch(lab)) },
    ];

    const READS: { label: string; value: string }[] = [
        { label: 'Family', value: hueFamily(hex) },
        { label: 'Value', value: valueWord(hex) },
        { label: 'Chroma', value: chromaWord(hex) },
        { label: 'Temperature', value: temperatureWord(hex) },
        { label: 'Luminance', value: `${(relativeLuminance(rgb) * 100).toFixed(1)}%` },
        { label: 'On white', value: `${onWhite.toFixed(2)}:1` },
        { label: 'On black', value: `${onBlack.toFixed(2)}:1` },
    ];

    const match = reading?.match ?? null;

    return createPortal(
        <div
            className="sticker-mgr-backdrop followers-backdrop cped-backdrop"
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Colorpedia"
            onClick={close}
        >
            <div className="ambient-pop followers-pop cped-pop" role="dialog" aria-label="Colorpedia" onClick={(e) => e.stopPropagation()}>
                <span
                    className="ambient-pop-close"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                >
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`◉${VS15}`}</span>{' '}
                        <span className="smgr-title-words">COLORPEDIA</span>
                    </span>
                </div>

                {/* THE SEARCH — colour names, hex, RGB, CMYK, HSL. Lives inside
                    the card; typing never dismisses it. */}
                <div className="cped-search">
                    <input
                        className="cped-search-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by: name · hex · RGB · CMYK · HSL"
                        aria-label="Search colours by name, hex, RGB, CMYK or HSL"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    {query && (
                        <button className="cped-search-clear" type="button" title="Clear" onClick={() => setQuery('')}>
                            {`×${VS15}`}
                        </button>
                    )}
                </div>

                <div className="followers-pop-body cped-body">
                    {search ? (
                        /* ── RESULTS ─────────────────────────────────────── */
                        <>
                            {search.parsed.hex && (
                                <button
                                    className="cped-read-back"
                                    type="button"
                                    onClick={() => goTo(search.parsed.hex as string)}
                                >
                                    <span className="cped-chip-swatch" style={{ background: search.parsed.hex }} />
                                    <span className="cped-read-back-text">
                                        READ AS {search.parsed.read} — TAP TO OPEN
                                    </span>
                                </button>
                            )}
                            <div className="cped-results">
                                {search.hits.length === 0 ? (
                                    <div className="cped-empty">No colour by that name in the book.</div>
                                ) : (
                                    search.hits.map((h) => (
                                        <button
                                            key={h.color.name}
                                            className="cped-result"
                                            type="button"
                                            onClick={() => goTo(h.color.hex)}
                                        >
                                            <span className="cped-chip-swatch" style={{ background: h.color.hex }} />
                                            <span className="cped-result-name">{h.color.name}</span>
                                            <span className="cped-result-leader" />
                                            <span className="cped-result-hex">{h.color.hex}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── THE COLOUR ──────────────────────────────────── */
                        <div className="cped-scroll">
                            <button
                                className="cped-hero"
                                type="button"
                                style={{ background: hex, color: ink }}
                                title="Copy hex"
                                onClick={() => copy('Hex', hex)}
                            >
                                <span className="cped-hero-hex">{hex}</span>
                            </button>

                            <div className="cped-name">{match ? match.color.name : hueFamily(hex)}</div>
                            {match && (
                                <div className="cped-name-sub">
                                    {match.exact
                                        ? `${match.color.origin.toUpperCase()} · EXACT`
                                        : `NEAREST NAMED · ${matchWord(match.delta).toUpperCase()} · ΔE ${match.delta.toFixed(1)}`}
                                </div>
                            )}

                            <div className="cped-section">FORMATS</div>
                            <div className="cped-formats">
                                {FORMATS.map((f) => (
                                    <button
                                        key={f.key}
                                        className="cped-format"
                                        type="button"
                                        title={`Copy ${f.label}`}
                                        onClick={() => copy(f.label, f.value)}
                                    >
                                        <span className="cped-format-label">{f.label}</span>
                                        <span className="cped-format-value">{f.value}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="cped-fineprint">
                                CMYK is the uncalibrated screen conversion — a press profile will differ.
                            </div>

                            <div className="cped-section">THE READ</div>
                            <div className="cped-reads">
                                {READS.map((r) => (
                                    <div className="cped-read" key={r.label}>
                                        <span className="cped-read-label">{r.label}</span>
                                        <span className="cped-read-leader" />
                                        <span className="cped-read-value">{r.value}</span>
                                    </div>
                                ))}
                            </div>

                            {match?.color.note && (
                                <>
                                    <div className="cped-section">
                                        {match.exact ? 'HISTORY' : `HISTORY OF ${match.color.name.toUpperCase()}`}
                                    </div>
                                    {!match.exact && (
                                        <div className="cped-fineprint">
                                            This is the story of the colour it matched, not of {hex} itself.
                                        </div>
                                    )}
                                    <p className="cped-note">{match.color.note}</p>
                                </>
                            )}

                            <div className="cped-section">HARMONIES</div>
                            {chords.map((c) => (
                                <div className="cped-chord" key={c.key}>
                                    <span className="cped-chord-label">{c.label}</span>
                                    <span className="cped-chord-strip">
                                        {c.hexes.map((h, i) => (
                                            <button
                                                key={`${c.key}-${i}`}
                                                className={`cped-chord-swatch${h === hex ? ' is-base' : ''}`}
                                                type="button"
                                                style={{ background: h }}
                                                title={h}
                                                onClick={() => goTo(h)}
                                            />
                                        ))}
                                    </span>
                                </div>
                            ))}

                            <div className="cped-section">NEIGHBOURS</div>
                            <div className="cped-results">
                                {kin.map((n) => (
                                    <button
                                        key={n.color.name}
                                        className="cped-result"
                                        type="button"
                                        onClick={() => goTo(n.color.hex)}
                                    >
                                        <span className="cped-chip-swatch" style={{ background: n.color.hex }} />
                                        <span className="cped-result-name">{n.color.name}</span>
                                        <span className="cped-result-leader" />
                                        <span className="cped-result-hex">ΔE {n.delta.toFixed(1)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
