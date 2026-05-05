'use client';

/*
 * TopBarRow — Build 33 D22 + D23.
 *
 * Sim refs:
 *   1068-1192    .top-bar-row + .bar-center-wrap + .hammer-bar-pill +
 *                rpc-ping-display + .grail-pill + supporting CSS
 *   1342-1358    .bar-pill-input + .rpc-ping-btn
 *   4377-4398    DOM markup (#topBarInner / #barCenterWrap /
 *                #incognitoPill / #hammerBarPill / #rpcPingDisplay)
 *   12317-12411  renderGrailBar — show/hide rules driving the row
 *   12453-12504  RPC engine (lives in lib/rpc/rpcEngine.ts now)
 *   12506-12524  Incognito engine (lives in lib/incognito/incognitoEngine.ts)
 *
 * What this component owns:
 *
 *   <.top-bar #topBar>
 *      <TopBarCalendar />          ← .top-bar-calendar-row, only when notifs.topBarCalendar
 *      <.top-bar-row #topBarInner> ← only when row has content
 *         <.bar-center-wrap>          ← centered absolute, only when incognito || hammer
 *            <.hammer-bar-pill #incognitoPill>     ⚇ Wallet: <input> ×
 *            <.hammer-bar-pill #hammerBarPill>     THE HAMMER  N  ×
 *         </>
 *         <.rpc-ping-display>         ← right-aligned, only when rpc active
 *            ⌁  Nms   (colour tier good/ok/slow)
 *         </>
 *      </>
 *   </>
 *
 * Why the wrapper moved here from TopBarCalendar:
 * Sim has ONE .top-bar element hosting both rows. Pre-Build-33 the
 * React port only needed it for the calendar row, so TopBarCalendar
 * owned it. Now the second row exists and needs the same parent —
 * either both components share a wrapper (this approach) or each
 * renders its own .top-bar div, which would yield two stacked
 * containers and a duplicate id="topBar". TopBarCalendar's wrapper is
 * dropped in this build; it now returns just .top-bar-calendar-row or
 * null. TopBarRow is the new mount point in Navbar.
 *
 * Show/hide gating mirrors sim 12317-12392:
 *   wrapper visible if any of: topBarCalendar | incognito | hammer | rpc-active
 *   inner row visible if any of: incognito | hammer | rpc-active
 *   bar-center-wrap.active if: incognito || hammer
 *   #incognitoPill.active if: incognito
 *   #hammerBarPill.active if: hammer
 *   #rpcPingDisplay display:'inline-flex' if: rpc-active else 'none'
 *
 * Grail pins (sim 12339-12362) are NOT yet ported — the React port has
 * no grail-pin store, no `metaCache`, and no `unpinGrail`. The CSS for
 * .grail-pill and friends ships in globals.css alongside the rest of
 * the row's styles so the surface is ready when grail-pin state lands;
 * runtime grail-pill rendering is out of Build 33 scope.
 *
 * Hammer count (sim 12372-12373): port reads `pd_hammer_count` from
 * localStorage and listens for `pd:hammer-count-changed` events,
 * matching Build 32's SpellBookSection badge pattern. Mute UI hasn't
 * shipped, so the count will be 0 in practice until a future build
 * dispatches that event.
 *
 * Hammer pill .filtering toggle (sim 1172-1181): sim's onclick wires
 * to `toggleMutedFilter` which gates `body.hammer-mode.muted-filter-active`
 * on edition cards. With no muted cards yet, the filter is dead code;
 * this build ships the CSS but does NOT wire the click. Documented
 * deviation — adding the filter without the underlying mute state
 * would just be a class-toggle going nowhere.
 *
 * Incognito ENS input: the bar-pill-input is a plain text field that
 * does nothing on change in sim (the ENS string is read by no caller
 * yet — same as the ENS pills in WalletSection). Enter blurs the
 * input (sim 4384). On activation we autofocus after 100ms (sim
 * 12519-12522).
 */

import { useEffect, useRef, useState } from 'react';
import {
    getRpcMs,
    getRpcQualityClass,
    isRpcActive,
    subscribeRpc,
} from '../../lib/rpc/rpcEngine';
import {
    isIncognitoActive,
    subscribeIncognito,
    toggleIncognito,
} from '../../lib/incognito/incognitoEngine';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { TopBarCalendar } from './TopBarCalendar';

export function TopBarRow() {
    const { notifs, toggle } = usePdNotifs();

    // Subscribe to engine state. We mirror engine state into React
    // state so toggles trigger re-renders. Initialised lazily from
    // current engine state so SSR-side render and first client render
    // both see `false` (engine is module-singleton; refresh resets).
    const [rpcActive, setRpcActive] = useState<boolean>(false);
    const [rpcMs, setRpcMs] = useState<number | null>(null);
    const [incognitoActive, setIncognitoActive] = useState<boolean>(false);

    useEffect(() => {
        // Hydrate from engine and stay subscribed.
        setRpcActive(isRpcActive());
        setRpcMs(getRpcMs());
        const offRpc = subscribeRpc((s) => {
            setRpcActive(s.active);
            setRpcMs(s.ms);
        });
        setIncognitoActive(isIncognitoActive());
        const offInc = subscribeIncognito((s) => {
            setIncognitoActive(s.active);
        });
        return () => {
            offRpc();
            offInc();
        };
    }, []);

    // Hammer count — same pattern as SpellBookSection (Build 32 D21).
    const [hammerCount, setHammerCount] = useState(0);
    useEffect(() => {
        const sync = () => {
            try {
                const raw = window.localStorage.getItem('pd_hammer_count');
                const n = raw == null ? 0 : parseInt(raw, 10);
                setHammerCount(Number.isFinite(n) && n > 0 ? n : 0);
            } catch {
                setHammerCount(0);
            }
        };
        sync();
        window.addEventListener('pd:hammer-count-changed', sync);
        return () => {
            window.removeEventListener('pd:hammer-count-changed', sync);
        };
    }, []);

    // Autofocus the ENS input on incognito activation (sim 12519-12522).
    const ensInputRef = useRef<HTMLInputElement | null>(null);
    const prevIncognitoRef = useRef<boolean>(false);
    useEffect(() => {
        if (incognitoActive && !prevIncognitoRef.current) {
            const t = setTimeout(() => {
                ensInputRef.current?.focus();
            }, 100);
            prevIncognitoRef.current = true;
            return () => clearTimeout(t);
        }
        prevIncognitoRef.current = incognitoActive;
    }, [incognitoActive]);

    const hasTopBarCalendar = !!notifs.topBarCalendar;
    const hasHammer = !!notifs.spell_hammer;
    const showCenter = incognitoActive || hasHammer;
    const showRow = showCenter || rpcActive;
    const showWrapper = hasTopBarCalendar || showRow;

    if (!showWrapper) return null;

    const rpcMsText = rpcMs === null ? '—' : `${rpcMs}ms`;
    const rpcMsClass =
        rpcMs === null ? 'rpc-ping-ms' : `rpc-ping-ms ${getRpcQualityClass(rpcMs)}`;

    return (
        <div className="top-bar" id="topBar">
            <TopBarCalendar />
            {showRow ? (
                <div className="top-bar-row" id="topBarInner">
                    {/* Incognito + Hammer: centered via absolute positioning */}
                    <div
                        className={`bar-center-wrap${showCenter ? ' active' : ''}`}
                        id="barCenterWrap"
                    >
                        <div
                            className={`hammer-bar-pill${incognitoActive ? ' active' : ''}`}
                            id="incognitoPill"
                            title="Incognito Proxy — Browse as Another Wallet"
                        >
                            <span className="hammer-bar-icon">⚇{'\uFE0E'}</span>
                            <span>Wallet:</span>
                            <input
                                ref={ensInputRef}
                                className="bar-pill-input"
                                id="incognitoEnsInput"
                                type="text"
                                placeholder="brendon.eth"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                enterKeyHint="done"
                                aria-label="Incognito wallet address"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                            />
                            <span
                                className="hammer-bar-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIncognito();
                                }}
                                title="Close Incognito Proxy"
                                role="button"
                                tabIndex={0}
                            >
                                ×
                            </span>
                        </div>

                        <div
                            className={`hammer-bar-pill hammer-pill-hefty${hasHammer ? ' active' : ''}`}
                            id="hammerBarPill"
                            title="The Hammer"
                        >
                            <span style={{ fontWeight: 900, letterSpacing: '0.5px' }}>
                                THE HAMMER
                            </span>
                            <span
                                className="hammer-bar-count hammer-count-nudge"
                                id="hammerBarCount"
                            >
                                {hammerCount}
                            </span>
                            <span
                                className="hammer-bar-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggle('spell_hammer');
                                }}
                                title="Turn off"
                                role="button"
                                tabIndex={0}
                            >
                                ×
                            </span>
                        </div>
                    </div>

                    {/* RPC: right-aligned via .top-bar-row .rpc-ping-display rule.
                        Inline display style mirrors sim's id-style toggle (sim 12376-12377). */}
                    <div
                        className="rpc-ping-display"
                        id="rpcPingDisplay"
                        style={{ display: rpcActive ? 'inline-flex' : 'none' }}
                        title="RPC Latency"
                    >
                        <span>⌁{'\uFE0E'}</span>
                        <span className={rpcMsClass} id="rpcPingMs">
                            {rpcMsText}
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
