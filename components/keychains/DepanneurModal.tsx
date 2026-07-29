'use client';

/*
 * THE DEPANNEUR — the keychain capsule machine (Brendon, 2026-07-27:
 * "simulate it for our testers like we do with stickers and our simETH").
 *
 * The Montreal corner store; the machine lives inside. Test phase runs on
 * sim-ETH: CRANK debits the price server-side, a crypto-random seed rolls
 * the genes through the CONTRACT's own art (lib/keychains/engine — the
 * byte-faithful twin of PDKeychainRenderer), and the charm lands in the
 * account. EVERY CHARM OWNS ITS OWN LOOK — colour, finish and chain metal all
 * roll per charm on a common→rare ladder; the keeper's streak/rank only buy
 * better odds at the crank (Brendon, 2026-07-29).
 *
 * ITS OWN WORLD (Brendon, 2026-07-29): the Depanneur is pinned dark at any
 * colorway — the charms are painted art and need one steady room to read in.
 *
 * Chrome = the FI-PLUS panel (SuiteModal's shell, reused verbatim).
 * Doors (Brendon-named): the KEYCHAINS ⚷ button in the PriceSprite modal +
 * the ⚷ key in wallet settings. Out: × / Esc / backdrop.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/state/bodyScrollLock';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import {
    CRANK_PRICE_ETH, charmSVG, charmTraits, genes, isValidCharmName, luckFor, SHAPE_NAMES,
    type CharmRecord, type Coin,
} from '../../lib/keychains/engine';
import { useKeychainRack, bustRack, refreshRack } from '../../lib/keychains/rack';
import { requestMotion } from '../../lib/keychains/sway';

const VS15 = '︎';

/** What a streak buys at the machine — the odds tier, in plain words. */
const LUCK_LABEL = ['BASE', 'BETTER', 'STRONG', 'BEST'] as const;

function CharmArt({ charm, uid, className }: {
    charm: CharmRecord; uid: string; className?: string;
}) {
    const svg = useMemo(
        () => charmSVG(charm.seed, uid, charm.luck, charm.name, charm.coin),
        [charm.seed, charm.name, uid, charm.luck, charm.coin],
    );
    return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function DepanneurModal() {
    const { close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('depanneur');
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const rack = useKeychainRack(isOpen ? siweAddress : null);

    const [cranking, setCranking] = useState(false);
    /* YIN/YANG (Brendon's two coin slots, 2026-07-28) — the pre-crank
       choice. No slot holds a coin until the keeper drops one (no default),
       and the crank won't turn without it. */
    const [coin, setCoin] = useState<Coin | null>(null);
    const [fresh, setFresh] = useState<CharmRecord | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [nameDraft, setNameDraft] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFresh(null); setPicked(null); setNameDraft(''); setCoin(null);
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    /* ── THE DEPANNEUR'S OWN PULL-TO-REFRESH (Brendon, 2026-07-29) ──────────
       The app's PWA pull is deliberately blocked inside modals, so this is the
       same gesture rebuilt against the panel's own scroller: the SAME pill,
       the same tint band, the same release-to-refresh law (it commits on
       release, never mid-pull) — but it refreshes the rack instead of
       reloading the app. Listeners stay passive: the inner scroller's own
       rubber-band is the visible pull. */
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const pillRef = useRef<HTMLDivElement | null>(null);
    const bandRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = bodyRef.current;
        if (!isOpen || !el || !siweAddress) return;

        const THRESHOLD = 130;  // px of raw pull at release that refreshes
        const TOP_EPS = 2;

        let startY = 0;
        let active = false;
        let pulling = false;
        let refreshing = false;
        let lastRaw = 0;
        let pendingRaw = 0;
        let raf = 0;
        let launched = false;

        const reset = () => {
            active = false; pulling = false; lastRaw = 0; pendingRaw = 0; launched = false;
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        };

        const snapBack = () => {
            const band = bandRef.current;
            const pill = pillRef.current;
            if (band) { band.style.transition = 'opacity 0.3s ease'; band.style.opacity = '0'; }
            if (pill) {
                pill.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                pill.style.transform = 'translate(-50%, -46px)';
                pill.style.opacity = '0';
                pill.classList.remove('armed', 'refreshing');
            }
        };

        const paint = () => {
            raf = 0;
            if (refreshing || !active || !pulling) return;
            const raw = pendingRaw;
            const armed = raw >= THRESHOLD;
            const band = bandRef.current;
            const pill = pillRef.current;
            if (band) {
                band.style.transition = 'none';
                band.style.opacity = armed ? '1' : String(Math.min(raw / THRESHOLD, 1) * 0.7);
            }
            if (pill) {
                // The pill doesn't track the finger — it eases to its resting
                // spot once and only its colour changes at the threshold.
                if (!launched) {
                    launched = true;
                    pill.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease';
                    pill.style.opacity = '1';
                    pill.style.transform = 'translate(-50%, 40px)';
                }
                pill.classList.toggle('armed', armed);
            }
        };

        const commit = async () => {
            if (refreshing) return;
            refreshing = true;
            reset();
            try { navigator.vibrate?.(12); } catch { /* unsupported (iOS) */ }
            const band = bandRef.current;
            const pill = pillRef.current;
            if (band) { band.style.transition = 'opacity 0.15s ease'; band.style.opacity = '1'; }
            if (pill) {
                pill.style.transition = 'transform 0.25s ease, opacity 0.2s ease';
                pill.style.opacity = '1';
                pill.style.transform = 'translate(-50%, 40px)';
                pill.classList.add('armed', 'refreshing');
            }
            // Never a blink — the pill is visibly working for a beat even when
            // the rack comes back instantly.
            await Promise.all([
                refreshRack(siweAddress),
                new Promise((res) => setTimeout(res, 480)),
            ]);
            snapBack();
            refreshing = false;
        };

        const onStart = (e: TouchEvent) => {
            if (refreshing) return;
            reset();
            if (e.touches.length !== 1) return;
            if (el.scrollTop > TOP_EPS) return;   // started mid-scroll
            startY = e.touches[0]!.clientY;
            active = true;
        };

        const onMove = (e: TouchEvent) => {
            if (refreshing || !active) return;
            if (e.touches.length !== 1) { reset(); snapBack(); return; }
            const raw = e.touches[0]!.clientY - startY;
            lastRaw = raw;
            if (raw <= 0) {
                pulling = false;
                if (raf) { cancelAnimationFrame(raf); raf = 0; }
                snapBack();
                return;
            }
            pulling = true;
            pendingRaw = raw;
            if (!raf) raf = requestAnimationFrame(paint);
        };

        const onEnd = () => {
            if (refreshing || !active) return;
            const go = pulling && lastRaw >= THRESHOLD;
            reset();
            if (go) void commit(); else snapBack();
        };

        const onCancel = () => { if (!refreshing) { reset(); snapBack(); } };

        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchmove', onMove, { passive: true });
        el.addEventListener('touchend', onEnd, { passive: true });
        el.addEventListener('touchcancel', onCancel, { passive: true });
        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', onEnd);
            el.removeEventListener('touchcancel', onCancel);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [isOpen, siweAddress]);

    const streak = rack?.streak ?? 0;
    /* What the streak is buying at the machine right now — the same tier the
       crank will bank into the charm. */
    const luck = luckFor(streak, rack?.rank ?? 0);
    const charms = rack?.charms ?? [];
    const shown: CharmRecord | null =
        (picked != null ? charms.find((c) => c.id === picked) : null) ?? fresh;

    const crank = async () => {
        if (!siweAddress || cranking || coin == null) return;
        setCranking(true);
        setFresh(null); setPicked(null); setNameDraft('');
        try {
            const r = await fetch('/api/keychains/crank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coin }),
            });
            const j = (await r.json().catch(() => null)) as { charm?: CharmRecord; error?: string } | null;
            if (!r.ok || !j?.charm) {
                showToast(`Depanneur: ${j?.error ? j.error.toUpperCase() : 'CRANK FAILED'}`);
                return;
            }
            // Let the machine turn — the capsule tumbles, then the reveal.
            await new Promise((res) => setTimeout(res, 900));
            setFresh(j.charm);
            bustRack(siweAddress);
            showToast('Keychains: NEW CHARM');
        } finally {
            setCranking(false);
        }
    };

    const christen = async () => {
        if (!shown || !siweAddress || busy) return;
        const name = nameDraft.toUpperCase().trim();
        if (!isValidCharmName(name)) { showToast('Christen: 2–12 CHARS · A–Z 0–9 SPACE'); return; }
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/christen', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: shown.id, name }),
            });
            if (r.ok) {
                if (fresh && fresh.id === shown.id) setFresh({ ...fresh, name });
                bustRack(siweAddress);
                setNameDraft('');
                showToast(`Christened: ${name}`);
            } else {
                const j = (await r.json().catch(() => null)) as { error?: string } | null;
                showToast(`Christen: ${j?.error ? j.error.toUpperCase() : 'FAILED'}`);
            }
        } finally { setBusy(false); }
    };

    const equip = async (id: number | null) => {
        if (!siweAddress || busy) return;
        /* THE TILT ASK RIDES THE EQUIP (Brendon, 2026-07-29) — the hang is
           always on, and this tap is the one deliberate moment iOS will let
           us ask for motion. Fire it before the await so it stays inside the
           gesture; a refusal just leaves the chain swinging on scroll. */
        if (id != null) void requestMotion();
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/equip', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (r.ok) {
                bustRack(siweAddress);
                showToast(id == null ? 'Charm: UNEQUIPPED' : 'Charm: EQUIPPED');
            }
        } finally { setBusy(false); }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="sticker-mgr-plus-backdrop"
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="The Depanneur"
            onClick={close}
        >
            <div className="sticker-mgr-plus followers-plus dp-plus" onClick={(e) => e.stopPropagation()}>
                {/* The pull's own chrome — the app's pill, scoped to the panel. */}
                <div className="dp-ptr-band" ref={bandRef} aria-hidden="true" />
                <div className="ptr-pill dp-ptr-pill" ref={pillRef} aria-hidden="true" />
                <div className="smgr-plus-head">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`⚷${VS15}`}</span>{' '}
                        <span className="smgr-title-words">THE DEPANNEUR</span>
                    </span>
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
                </div>
                <div className="followers-plus-body dp-body" ref={bodyRef}>
                    {!siweAddress ? (
                        <p className="dp-note">Connect your wallet to crank the machine.</p>
                    ) : (
                        <>
                            {/* THE MASTHEAD — the approved sheet's own, verbatim
                                treatment (Brendon, 2026-07-29). */}
                            <div className="dp-mast">
                                <p className="dp-mast-sub">{`PD · THE DEPANNEUR ⚷${VS15}`}</p>
                                <h2 className="dp-mast-title">KEYCHAINS<span className="dp-mast-dot">.</span></h2>
                                <p className="dp-mast-sub">DROP A COIN · TURN THE CRANK · SEE WHAT FALLS OUT</p>
                            </div>

                            {/* THE STREAK BAR — what your streak is buying you at
                                the machine, in the sheet's pink box. */}
                            <div className="dp-streak">
                                <b>{streak}</b>{streak === 1 ? ' DAY STREAK' : ' DAY STREAK'} — <b>{LUCK_LABEL[luck]}</b> ODDS ON YOUR NEXT PULL
                            </div>

                            {/* THE MACHINE */}
                            <div className="dp-machine">
                                <span className={`dp-machine-cap${cranking ? ' turning' : ''}`}>{`⚷${VS15}`}</span>
                                <div className="dp-machine-col">
                                    <span className="dp-machine-name">THE CAPSULE MACHINE</span>
                                    <span className="dp-machine-line">One crank · one charm · one of 58,060,800</span>
                                </div>
                                <button
                                    type="button"
                                    className={`dp-crank${cranking ? ' cranking' : ''}`}
                                    onClick={() => { void crank(); }}
                                    disabled={cranking || coin == null}
                                >
                                    {cranking ? 'CRANKING…' : coin == null ? 'DROP A COIN' : `CRANK · ${CRANK_PRICE_ETH.toFixed(3)} ETH`}
                                </button>
                            </div>

                            {/* THE TWO COIN SLOTS — which one you drop the
                                coin in steers palette/face/accessory weights;
                                shapes are universal (the ALIEN chase is equal). */}
                            <div className="dp-coins">
                                <button
                                    type="button"
                                    className={`dp-coin-slot${coin === 0 ? ' on' : ''}`}
                                    onClick={() => setCoin(coin === 0 ? null : 0)}
                                >
                                    <span className="dp-coin-name">{`⚋${VS15} YIN`}</span>
                                    <span className="dp-coin-line">pinks · bows · lashes</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dp-coin-slot${coin === 1 ? ' on' : ''}`}
                                    onClick={() => setCoin(coin === 1 ? null : 1)}
                                >
                                    <span className="dp-coin-name">{`⚊${VS15} YANG`}</span>
                                    <span className="dp-coin-line">louds · crowns · shades</span>
                                </button>
                            </div>

                            {/* THE REVEAL / the picked charm */}
                            {shown && (
                                <div className="dp-reveal">
                                    <CharmArt charm={shown} uid={`dp${shown.id}`} className="dp-charm-big" />
                                    <div className="dp-sheet">
                                        {shown.name && <div className="dp-sheet-name">{shown.name}</div>}
                                        <div className="dp-traits">
                                            {charmTraits(shown.seed, shown.luck, shown.coin).map((t) => (
                                                <span key={t.k} className="dp-trait">
                                                    <span className="dp-trait-k">{t.k.toUpperCase()}</span>
                                                    <span className="dp-trait-v">{t.v}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="dp-actions">
                                            {rack?.equipped === shown.id ? (
                                                <button type="button" className="dp-btn on" onClick={() => { void equip(null); }} disabled={busy}>UNEQUIP</button>
                                            ) : (
                                                <button type="button" className="dp-btn" onClick={() => { void equip(shown.id); }} disabled={busy}>EQUIP ON PROFILE</button>
                                            )}
                                        </div>
                                        {!shown.name && (
                                            <div className="dp-christen">
                                                <input
                                                    className="dp-christen-input"
                                                    type="text"
                                                    value={nameDraft}
                                                    placeholder="CHRISTEN — ONCE, EVER"
                                                    maxLength={12}
                                                    autoCapitalize="characters"
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    onChange={(e) => setNameDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''))}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') void christen(); }}
                                                />
                                                <button type="button" className="dp-btn" onClick={() => { void christen(); }} disabled={busy || !nameDraft.trim()}>NAME IT</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MY CHARMS — the sheet's own section header, and
                                every tile captioned the way THE CAST is. */}
                            <header className="dp-sh">
                                <h3>THE CAST</h3>
                                <p>12 shapes · rarest pull: ALIEN, 1 in 50</p>
                            </header>
                            {charms.length === 0 ? (
                                <p className="dp-note">Nothing on the rack yet — crank the machine.</p>
                            ) : (
                                <div className="dp-rack">
                                    {charms.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`dp-rack-slot${shown?.id === c.id ? ' on' : ''}`}
                                            onClick={() => { setPicked(c.id); setNameDraft(''); }}
                                            title={c.name || `Charm #${c.id}`}
                                        >
                                            <CharmArt charm={c} uid={`rk${c.id}`} className="dp-charm-mini" />
                                            <span className="dp-rack-cap">
                                                {c.name || SHAPE_NAMES[genes(c.seed, c.coin, c.luck).shape]}
                                            </span>
                                            {rack?.equipped === c.id && <span className="dp-rack-worn">WORN</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
