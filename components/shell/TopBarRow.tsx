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
 *            ⌁  Nms   (color tier good/ok/slow)
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
 * Hammer pill .filtering toggle (sim 1172-1181 + sim 12727-12742) — chat #4:
 * the pill body click now fires `handleToggleMutedFilter`, which gates
 * `body.muted-filter-active` (combined with body.hammer-mode it hides every
 * non-muted card via the sim 1184 rule). The `.filtering` class on the pill
 * inverts its colors so the user sees the filter is engaged. When hammer
 * mode is turned off (× close button, or the spell book toggle), sim
 * 12704-12709 forces the muted-only filter off too; the React port
 * mirrors that with a `useEffect` watching `hasHammer` going from true →
 * false. Toast string `Muted Only ON/OFF` matches sim 12740 verbatim.
 *
 * Incognito ENS input: the bar-pill-input is a plain text field that
 * does nothing on change in sim (the ENS string is read by no caller
 * yet — same as the ENS pills in WalletSection). Enter blurs the
 * input (sim 4384). On activation we autofocus after 100ms (sim
 * 12519-12522).
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { buildOutputMetaFor } from '../../lib/state/ProjectContext';
import { getProject } from '../../lib/project/registry';
import { projectMarketStat, traitMarketStat } from '../../lib/market/starredMarket';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import {
    getGrails,
    subscribeGrails,
    unpinGrailItem,
    grailKey,
    type GrailPin,
} from '../../lib/pins/grailStore';
import { TopBarCalendar } from './TopBarCalendar';

export function TopBarRow() {
    const { notifs, toggle } = usePdNotifs();
    const { open: openOutputModal } = useModal();
    const { showToast } = useToast();
    const router = useRouter();

    // Subscribe to engine state. We mirror engine state into React
    // state so toggles trigger re-renders. Initialised lazily from
    // current engine state so SSR-side render and first client render
    // both see `false` (engine is module-singleton; refresh resets).
    const [rpcActive, setRpcActive] = useState<boolean>(false);
    const [rpcMs, setRpcMs] = useState<number | null>(null);
    const [incognitoActive, setIncognitoActive] = useState<boolean>(false);

    /* F50 (BUG-02) — grail pill row. Subscribed to grailStore so the
       pills reflect the latest pin set whether the user pinned from
       the modal pin button, the gallery hover icon, or another tab
       still attached to the same localStorage key. SSR-safe: the lazy
       initialiser reads the empty default; the useEffect below
       hydrates from localStorage and keeps the snapshot in sync. */
    const [grailPins, setGrailPins] = useState<readonly GrailPin[]>([]);
    useEffect(() => {
        setGrailPins(getGrails());
        return subscribeGrails((next) => setGrailPins(next));
    }, []);

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

    /* chat #4 — hammer pill body click → toggleMutedFilter (sim
       12727-12742). `.filtering` is local React state because the
       inverted-pill visual reads it from the className. Sim writes
       directly to the DOM; React port mirrors the effect by piping it
       through state. The body class itself we toggle imperatively
       since `body.muted-filter-active` is referenced by globals.css
       (sim 1184) and there's no central body-class hook for non-spell
       transient flags — same approach the sim takes. */
    const [filtering, setFiltering] = useState(false);
    const handleToggleMutedFilter = () => {
        // Sim 12731 — only meaningful when hammer mode is on.
        if (typeof document === 'undefined') return;
        if (!document.body.classList.contains('hammer-mode')) return;
        const next = !document.body.classList.contains('muted-filter-active');
        document.body.classList.toggle('muted-filter-active', next);
        setFiltering(next);
        // Sim 12740 — normalized ON/OFF toast format.
        showToast('Muted Only: ' + (next ? 'ON' : 'OFF'));
    };

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

    /* When hammer mode flips off (× on the pill, spell book toggle, etc),
       sim 12704-12709 forces the muted-only filter off too — the filter
       is meaningless without the mode. Mirror that here. The body-class
       hammer-mode itself is owned by useBodyClass; we just clean up the
       muted-filter-active body class + our local filtering state when
       hasHammer transitions true → false. */
    useEffect(() => {
        if (hasHammer) return;
        if (typeof document !== 'undefined') {
            document.body.classList.remove('muted-filter-active');
        }
        setFiltering(false);
    }, [hasHammer]);
    /* F50 (BUG-02) — sim 12342: grail pills render only when neither
       Incognito nor Hammer is active. Both modes hide the user's
       grails for privacy / focus reasons (the bar still appears for
       RPC etc). Sim's hidden state is built into renderGrailBar's
       early return; the React port computes the same predicate inline
       so the pills array can be rendered or skipped without an
       imperative DOM mutation. */
    const grailsVisible =
        grailPins.length > 0 && !incognitoActive && !hasHammer;
    /* sim 12390 — the inner row's own visibility key still tracks the
       grail count so we don't render an empty 24px-min-height grey
       strip when only the calendar row is on. Grails count toward the
       row even when hidden by incognito/hammer? No — sim 12390 OR
       chains hasGrails | hasRpc | hasIncognito | hasHammer with the
       grails part already false when masked, so the masking flows
       through. We mirror that with `grailsVisible`. */
    const showCenter = incognitoActive || hasHammer;
    const showRow = grailsVisible || showCenter || rpcActive;
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
                    {/* F50 (BUG-02) — sim 12343-12362 grail pill list.
                        Inserted BEFORE the center wrap so the row reads
                        left→ pills → center (incognito/hammer) → right
                        (RPC) per sim 12360-12361. Each pill shows
                        project title (8-char "short" mask if short),
                        #id, listed price (if any), and an unpin × that
                        stops propagation so the surrounding pill click
                        opens the modal instead. Display title flips to
                        ████████ blocks when redactedMode is on (sim 12348).
                        notifs.redactedMode is the React port's field
                        name — sim uses notifs.redacted; same semantic. */}
                    {grailsVisible &&
                        grailPins.map((pin) => (
                            <GrailPill
                                key={grailKey(pin)}
                                pin={pin}
                                redacted={!!notifs.redactedMode}
                                onOpen={() => {
                                    if ((pin.kind === 'output' || pin.kind === 'wishlist') && pin.id != null) {
                                        openOutputModal('output', pin.id, pin.slug);
                                    } else if (pin.kind === 'soundtrack' && pin.playlistId) {
                                        window.open(playlistWatchUrl(pin.playlistId), '_blank', 'noopener,noreferrer');
                                    } else if (pin.kind === 'artist') {
                                        // In-app route to the canonical bare handle (strip any
                                        // leading @, which would 301-redirect through a blank hop).
                                        router.push('/' + pin.slug.replace(/^@/, ''));
                                    } else {
                                        // Projects live at /art/{slug} — the canonical, non-redirecting path.
                                        router.push('/art/' + pin.slug);
                                    }
                                }}
                                onUnpin={() => {
                                    if (unpinGrailItem(pin)) {
                                        showToast(`${grailPillLabel(pin)} DE-PINNED`);
                                    }
                                }}
                            />
                        ))}
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
                            className={
                                'hammer-bar-pill hammer-pill-hefty' +
                                (hasHammer ? ' active' : '') +
                                (filtering ? ' filtering' : '')
                            }
                            id="hammerBarPill"
                            title="The Hammer — tap to filter muted"
                            onClick={handleToggleMutedFilter}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleToggleMutedFilter();
                                }
                            }}
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

/* F50 (BUG-02) — single grail pill. Sim 12350-12357 builds this DOM
   imperatively; we render it from a small subcomponent that calls
   useOutputMeta inside a hooked function (loop above can't call hooks
   directly). Pill text:
     - title    : PROJECT_TITLE (or ████████ when redacted, sim 12348);
                  "short" variant (no fade mask) when ≤ 8 chars (sim 12349)
     - id       : `#${id}` (sim 12355)
     - price    : numeric ETH minus the " ETH" suffix (sim 12356), only
                  rendered when meta.price is non-null
     - unpin ×  : stopPropagation handler so it removes the pin without
                  opening the modal beneath (sim 12357)

   onOpen handles the body click — same as sim's `onclick = function() {
   openModal(id); }` at sim 12352. */
/* Follower counts for pinned artists — fetched once per handle, cached for the
   session so re-renders don't refetch (the pill shows the bare number). */
const artistFollowerCache = new Map<string, number>();

/* ETH amounts in a pill: show 4 significant digits, decimal where it fits —
   25.67, 0.228, 1.234 (Brendon 2026-06-19). */
function fmtEth4(s: string): string {
    const n = parseFloat(s);
    if (!isFinite(n)) return s;
    const intDigits = Math.max(1, Math.trunc(Math.abs(n)).toString().length);
    return n.toFixed(Math.max(0, 4 - intDigits));
}
/* Follower counts: compact, max 2 significant figures — 2.2k, 10k, 1.2m. */
function fmtCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) { const k = n / 1000; return (k < 10 ? k.toFixed(1) : Math.round(k).toString()) + 'k'; }
    const m = n / 1_000_000; return (m < 10 ? m.toFixed(1) : Math.round(m).toString()) + 'm';
}

/* Short, human label for a pin (toast text). */
function grailPillLabel(pin: GrailPin): string {
    const name = getProject(pin.slug)?.displayName ?? pin.slug.toUpperCase();
    const coll = name.charAt(0) + name.slice(1).toLowerCase();
    switch (pin.kind) {
        case 'output': return `${coll} #${pin.id}`;
        case 'wishlist': return `${coll} #${pin.id}`;
        case 'trait': return `${coll} \u00b7 ${pin.value}`;
        case 'artist': return `@${pin.slug}`;
        case 'soundtrack': return `${coll} \u266a`;
        default: return coll;
    }
}

interface GrailPillProps {
    pin: GrailPin;
    redacted: boolean;
    onOpen: () => void;
    onUnpin: () => void;
}

function GrailPill({ pin, redacted, onOpen, onUnpin }: GrailPillProps) {
    /* Resolve the pin's OWN project (not the active page's) so the pill always
       reads the actual pinned item, e.g. Oracle #7 (Brendon 2026-06-13). */
    const projectTitle = getProject(pin.slug)?.displayName ?? pin.slug.toUpperCase();
    const redactedTitle = '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588';

    /* Artist pin shows the artist's follower count (a bare number \u2014 no label,
       Brendon 2026-06-19). One cached fetch per handle. */
    const [artistFollowers, setArtistFollowers] = useState<number | null>(
        pin.kind === 'artist' ? artistFollowerCache.get(pin.slug) ?? null : null,
    );
    useEffect(() => {
        if (pin.kind !== 'artist') return;
        const cached = artistFollowerCache.get(pin.slug);
        if (cached != null) { setArtistFollowers(cached); return; }
        let cancel = false;
        fetch(`/api/user/by-handle/${pin.slug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((u) => {
                if (cancel || !u) return;
                const c = typeof u.follower_count === 'number' ? u.follower_count : 0;
                artistFollowerCache.set(pin.slug, c);
                setArtistFollowers(c);
            })
            .catch(() => { /* leave null */ });
        return () => { cancel = true; };
    }, [pin.kind, pin.slug]);

    /* Per-kind body. Output keeps its original look (title, #id, listed price).
       Project/Trait show the FLOOR price (Brendon 2026-06-19), not a listing.
       Artist shows just the @handle. Soundtrack shows the @project with a play
       affordance instead of a price. */
    let displayTitle: string;
    let idText: string | null = null;
    let priceText: string | null = null;
    /* Leading glyph before the title: ⨝ for traits, ▶ for soundtracks
       (Brendon 2026-06-19). */
    let leadGlyph: string | null = null;
    let titleAttr: string;

    if (pin.kind === 'output' || pin.kind === 'wishlist') {
        const meta = buildOutputMetaFor(pin.slug, pin.id!);
        displayTitle = redacted ? redactedTitle : projectTitle;
        if (pin.kind === 'wishlist') leadGlyph = '\u271b\ufe0e';
        idText = `#${pin.id}`;
        priceText = meta?.price ? fmtEth4(meta.price.replace(' ETH', '')) : null;
        titleAttr = `${pin.kind === 'wishlist' ? 'Wishlist \u2014 ' : ''}${projectTitle} #${pin.id}${meta?.price ? ` \u00b7 ${meta.price}` : ''}`;
    } else if (pin.kind === 'project') {
        displayTitle = redacted ? redactedTitle : projectTitle;
        const floor = projectMarketStat(pin.slug).floor;
        priceText = floor && floor !== '\u2014' ? fmtEth4(floor.replace(' ETH', '')) : null;
        titleAttr = `${projectTitle}${priceText ? ` \u00b7 floor ${priceText}` : ''}`;
    } else if (pin.kind === 'trait') {
        displayTitle = redacted ? redactedTitle : (pin.value ?? projectTitle);
        leadGlyph = '\u2a1d\ufe0e';
        const floor = traitMarketStat(pin.slug, pin.category ?? '', pin.value ?? '').floor;
        priceText = floor && floor !== '\u2014' ? fmtEth4(floor.replace(' ETH', '')) : null;
        titleAttr = `${projectTitle} \u00b7 ${pin.category}: ${pin.value}${priceText ? ` \u00b7 floor ${priceText}` : ''}`;
    } else if (pin.kind === 'artist') {
        displayTitle = redacted ? redactedTitle : `@${pin.slug}`;
        priceText = artistFollowers != null ? fmtCount(artistFollowers) : null;
        titleAttr = `@${pin.slug}${artistFollowers != null ? ` · ${artistFollowers} followers` : ''}`;
    } else {
        // soundtrack
        displayTitle = redacted ? redactedTitle : `@${pin.slug}`;
        leadGlyph = '\u25b6\ufe0e';
        titleAttr = `${projectTitle} soundtrack \u2014 play`;
    }

    const titleShortClass = displayTitle.length <= 8 ? ' short' : '';

    return (
        <span
            className="grail-pill"
            title={titleAttr}
            onClick={onOpen}
            role="button"
            tabIndex={0}
        >
            {leadGlyph && <span className="grail-pill-play" aria-hidden="true">{leadGlyph}</span>}
            <span className={`grail-pill-title${titleShortClass}`}>
                {displayTitle}
            </span>
            {idText && <span className="grail-pill-id">{idText}</span>}
            {priceText && <span className="grail-pill-price">{priceText}</span>}
            <span
                className="grail-pill-unpin"
                onClick={(e) => {
                    e.stopPropagation();
                    onUnpin();
                }}
                title="Unpin"
                role="button"
                tabIndex={0}
            >
                {'\u00D7'}
            </span>
        </span>
    );
}
