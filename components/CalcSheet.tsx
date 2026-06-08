'use client';

/*
 * CalcSheet
 *
 * Renderer for CalcSheetContext. Always rendered inside the provider;
 * visibility is driven by .mounted (display: flex) + .active (opacity 1
 * + slide-up). Same two-stage pattern as ValuePromptModal so the close
 * animation runs before unmount (matches sim line 11644-11645 — drop
 * .active first, wait 240ms, then drop .mounted).
 *
 * Math constants — sim 11584-11586. Hardcoded for the prototype; in
 * production these come from contract config + a gas oracle.
 *
 * Recalc model: P&L is recomputed every render from the controlled
 * `offer` string + the config's `floor`. Cheap enough that we don't
 * need useMemo — typing 4 digits doesn't cost anything. The headline
 * Net row gets the visual priority (see styles/modal.css).
 *
 * Pre-fill rule (sim 11614-11620): listed price wins; else floor; else
 * blank. Saves "what would I net at this price" in zero keystrokes.
 *
 * Focus + select on open (sim 11633-11635 + the .active rAF chain): the
 * 280ms timer covers the 220ms slide-up + a buffer so .focus()/.select()
 * lands after the transition has settled and after iOS Safari's tap-
 * focus suppression window.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import type { CalcSheetConfig } from '../lib/state/CalcSheetContext';

interface Props {
    config: CalcSheetConfig | null;
    onClose: () => void;
}

const CALC_ROYALTY_PCT = 0.05;
const CALC_GAS_ESTIMATE_ETH = 0.0008;

const FOCUS_DELAY_MS = 280;
const CLOSE_FADE_MS  = 240;

/* iOS variant selector 15 — keeps Unicode glyphs in text-style form
   instead of upgrading to emoji presentation. Same discipline as
   OutputPreview + the rest of the modal surfaces. */
const VS15 = '\uFE0E';

/** 4-decimal "0.0000 ETH" — calculator precision for the line items.
    Falls back to em-dash when the value can't be computed (no floor,
    bad input, etc). */
function fmt(n: number): string {
    return Number.isFinite(n) ? n.toFixed(4) + ' ETH' : '—';
}

/** Same 4-decimal precision but always signed ("+0.0042 ETH" /
    "−0.0042 ETH") so the headline Net row's polarity is unambiguous
    at a glance. Uses U+2212 minus, not ASCII hyphen. */
function fmtSigned(n: number): string {
    if (!Number.isFinite(n)) return '—';
    const sign = n >= 0 ? '+' : '\u2212';
    return sign + Math.abs(n).toFixed(4) + ' ETH';
}

export default function CalcSheet({ config, onClose }: Props) {
    /* Two-stage visibility — `mounted` is React-tree presence,
       `active` is the CSS animation flag (matches ValuePromptModal). */
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);

    /* Cache the most recent non-null config so the close fade renders
       the prior content. Without this, during the 240ms fade window the
       offer pre-fill empties, the context line falls back to em-dash,
       and every P&L row computes from NaN-floor → "—". Sim avoids this
       by never tearing DOM down on close (line 11638-11646 just toggles
       classes); the React port drives the fade off `config` going null
       and needs the prior render data preserved. Ref-during-render is
       idempotent and depends only on the current config. */
    const lastConfigRef = useRef<CalcSheetConfig | null>(null);
    if (config) {
        lastConfigRef.current = config;
    }
    const renderConfig = config ?? lastConfigRef.current;

    /* Pre-fill seed — recomputed when config changes. Listed price first,
       floor second, blank third. Sim 11614-11620. */
    const initialOffer = useMemo(() => {
        if (!config) return '';
        if (config.price != null) return config.price.toFixed(3);
        if (config.floor != null) return config.floor.toFixed(3);
        return '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);
    const [offer, setOffer] = useState<string>(initialOffer);

    const inputRef = useRef<HTMLInputElement>(null);

    /* Open: when config arrives, seed input + mount + rAF active +
       focus-select after the slide-up settles. */
    useEffect(() => {
        if (!config) return;
        setOffer(initialOffer);
        setMounted(true);
        const rafId = requestAnimationFrame(() => setActive(true));
        const focusTimer = setTimeout(() => {
            const inp = inputRef.current;
            if (inp) {
                try {
                    inp.focus();
                    inp.select();
                } catch {
                    /* swallow — iOS Safari occasionally throws here. */
                }
            }
        }, FOCUS_DELAY_MS);
        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(focusTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);

    /* Close: when config goes null while still mounted, drop .active
       immediately, then drop .mounted after the 240ms fade so the slide-
       down animation gets to run. */
    useEffect(() => {
        if (config || !mounted) return;
        setActive(false);
        const t = setTimeout(() => setMounted(false), CLOSE_FADE_MS);
        return () => clearTimeout(t);
    }, [config, mounted]);

    /* P&L ladder. Deductions stored as positive amounts — the "−" lives
       in each row label so accounting reads cleanly. Royalty is the full
       on-chain royalty (5%); the 60/40 split into 3% artist / 2% platform
       happens downstream in PaymentSplitter, after the seller is paid. */
    const offerNum = parseFloat(offer);
    const floor = renderConfig?.floor ?? NaN;
    const royalty  = Number.isFinite(floor) ? floor * CALC_ROYALTY_PCT      : NaN;
    const gas      = CALC_GAS_ESTIMATE_ETH;
    const takehome = Number.isFinite(floor)
        ? floor - royalty - gas
        : NaN;
    const net = (Number.isFinite(takehome) && Number.isFinite(offerNum))
        ? takehome - offerNum
        : NaN;

    /* vs-floor delta — % the offer sits above/below the project floor.
       Snap to "at floor" inside ±0.5% so tiny float drift doesn't read
       as "+0.0% vs floor". Sim 11665-11678. */
    let vsFloor = '';
    if (
        Number.isFinite(offerNum) && offerNum > 0 &&
        Number.isFinite(floor) && floor > 0
    ) {
        const pct = ((offerNum / floor) - 1) * 100;
        if (Math.abs(pct) < 0.5) {
            vsFloor = 'at floor';
        } else if (pct > 0) {
            vsFloor = `+${pct.toFixed(1)}% vs floor`;
        } else {
            vsFloor = `\u2212${Math.abs(pct).toFixed(1)}% vs floor`;
        }
    }

    /* Headline Net display — base signed amount, with a (±X.X%) suffix
       when the offer is positive. Sim 11697-11705. */
    let netDisplay = fmtSigned(net);
    if (Number.isFinite(net) && Number.isFinite(offerNum) && offerNum > 0) {
        const pct = (net / offerNum) * 100;
        const pctSign = pct >= 0 ? '+' : '\u2212';
        netDisplay = `${fmtSigned(net)} (${pctSign}${Math.abs(pct).toFixed(1)}%)`;
    }

    /* Backdrop click — only fire close when the click target is the wrap
       itself, not bubbled from inside the box. Sim 11638-11646. */
    const handleBackdrop = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    const wrapClass = [
        'calc-sheet-wrap',
        mounted ? 'mounted' : '',
        active ? 'active' : '',
    ].filter(Boolean).join(' ');

    /* Defensive: when neither mounted nor configured, render nothing —
       saves a hidden node when calc has never been opened. */
    if (!mounted && !config) return null;

    /* Context line — "COLLECTION #N — listed X.XXX ETH" or the
       not-listed / no-floor variants. Sim 11603-11612. Rendered as JSX
       (not raw HTML) so the project name — which artists choose — is
       escaped as text; the italics are kept via a real <em> element. */
    let contextNode: ReactNode = '\u2014';
    if (renderConfig) {
        const base = (
            <>
                <em>{renderConfig.projectTitle}</em> #{renderConfig.tokenId}
            </>
        );
        if (renderConfig.price != null) {
            contextNode = <>{base} {'\u2014'} listed {renderConfig.price.toFixed(3)} ETH</>;
        } else if (renderConfig.floor != null) {
            contextNode = <>{base} {'\u2014'} not listed {'\u00B7'} Floor {renderConfig.floor.toFixed(3)} ETH</>;
        } else {
            contextNode = base;
        }
    }

    return (
        <div
            className={wrapClass}
            id="calcSheetWrap"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="calc-sheet-box"
                id="calcSheetBox"
                onClick={(e) => e.stopPropagation()}
            >
                <span
                    className="calc-sheet-close-x"
                    onClick={onClose}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onClose();
                        }
                    }}
                    title="Close"
                >
                    {`\u00D7${VS15}`}
                </span>

                <div className="calc-sheet-title">
                    The Calc
                    <span className="calc-sheet-title-glyph">{'\u0192'}</span>
                </div>

                <div className="calc-sheet-context" id="calcSheetContext">
                    {contextNode}
                </div>

                <div className="calc-sheet-field">
                    <div className="calc-sheet-field-label">Your offer</div>
                    <div className="calc-sheet-input-row">
                        <input
                            ref={inputRef}
                            className="calc-sheet-input"
                            id="calcSheetOffer"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="0.000"
                            value={offer}
                            onChange={(e) => setOffer(e.target.value)}
                        />
                        <span className="calc-sheet-input-suffix">ETH</span>
                    </div>
                    <div
                        className="calc-sheet-vs-floor"
                        id="calcSheetVsFloor"
                    >
                        {vsFloor || '\u00A0'}
                    </div>
                </div>

                <div className="calc-sheet-divider"></div>
                <div className="calc-sheet-section-label">
                    PnL if sold at floor
                </div>

                <div className="calc-sheet-line">
                    <span className="calc-sheet-line-label">Sell at floor</span>
                    <span className="calc-sheet-line-val" id="calcSheetFloor">
                        {fmt(floor)}
                    </span>
                </div>
                <div className="calc-sheet-line calc-sheet-line-deduct">
                    <span className="calc-sheet-line-label">
                        {`\u2212 Royalty (5%)`}
                    </span>
                    <span className="calc-sheet-line-val" id="calcSheetRoyalty">
                        {fmt(royalty)}
                    </span>
                </div>
                <div className="calc-sheet-line calc-sheet-line-deduct">
                    <span className="calc-sheet-line-label">
                        {`\u2212 Gas estimate`}
                    </span>
                    <span className="calc-sheet-line-val" id="calcSheetGas">
                        {fmt(gas)}
                    </span>
                </div>
                <div className="calc-sheet-divider calc-sheet-divider-thin"></div>
                <div className="calc-sheet-line calc-sheet-line-subtotal">
                    <span className="calc-sheet-line-label">Take-home</span>
                    <span className="calc-sheet-line-val" id="calcSheetTakehome">
                        {fmt(takehome)}
                    </span>
                </div>
                <div className="calc-sheet-line calc-sheet-line-deduct">
                    <span className="calc-sheet-line-label">
                        {`\u2212 Your offer`}
                    </span>
                    <span className="calc-sheet-line-val" id="calcSheetOfferOut">
                        {fmt(offerNum)}
                    </span>
                </div>
                <div className="calc-sheet-divider"></div>
                <div className="calc-sheet-line calc-sheet-line-result">
                    <span className="calc-sheet-line-label">Net</span>
                    <span className="calc-sheet-line-val" id="calcSheetNet">
                        {netDisplay}
                    </span>
                </div>
            </div>
        </div>
    );
}
