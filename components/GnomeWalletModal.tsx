'use client';

/*
 * GnomeWalletModal — the gnomewallet (one word, all lowercase — Brendon,
 * 2026-07-19).
 *
 * YOUR side of the gnome world: the tab is the gnome's home; this modal is
 * the keeper's own wallet — an entire other world behind the settings pill
 * (beside Fiat, revealed by your first gnome). The design brief, verbatim
 * intent: "the most exaggerated Keebler elf Tolkien gnomish wallet and
 * marketplace UI you could imagine, like taking some magic mushrooms" —
 * carved woodwork chrome, a hanging shingle sign, hobbit-door cards, vine
 * and toadstool trim, lamplight. A Brendon-approved pinned-theme surface
 * (Composer-dark precedent): never "fix" it back to colorway; every
 * readable element stays FULL-STRENGTH cream on timber (Rule #2).
 *
 * Two wings:
 *   • MY BURROW — every gnome in your keeping, alive (seeded breath/blink,
 *     tap → the favoured greeting). List one by hanging a sign on its door
 *     (ask in real ETH, ≤4dp) or take the sign down. Listing moves no money.
 *   • THE MUSHROOM MARKET — every listed gnome on the platform, keeper +
 *     price on the door. The paid deal (the counting house) is the NEXT
 *     mechanic — no dead buy buttons until it's real.
 *
 * Mounted once in PriceOSShell; rides ModalContext (Tarot precedent).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { getProject, projectColorway } from '../lib/project/registry';
import { projectGnome, gnomePalette } from '../lib/project/gnome';
import { gnomeGreeting } from '../lib/project/gnomeVoice';
import {
    GNOME_GLYPH, GNOME_TAGLINE, GNOME_MARKET_NAME,
    gnomeAddress, gnomeEns, shortGnomeAddress,
    type GnomeAwakening,
} from '../lib/project/gnomeWorld';
import { hashString } from '../lib/art/rng';
import { fmtFeedDate } from './profile/profilePageShared';
import { GnomeFigure } from './project/GnomePanel';

const VS15 = '︎';

type Wing = 'burrow' | 'market';

/* The lantern over the door — lamplight for the whole hall. Sways gently;
   the glow breathes (both CSS). Drawn in the keepsake-lantern style. */
function HallLantern() {
    return (
        <svg className="gw-lantern" viewBox="0 0 60 90" aria-hidden="true">
            <line x1="30" y1="0" x2="30" y2="22" stroke="#4a3526" strokeWidth="3" />
            <path d="M 22,26 Q 30,14 38,26" fill="none" stroke="#2a2622" strokeWidth="2.5" />
            <circle className="gw-lantern-glow" cx="30" cy="46" r="24" fill="#ffd75e" opacity="0.22" />
            <rect x="17" y="26" width="26" height="36" rx="6" fill="#4a3526" stroke="#2a2622" strokeWidth="2.5" />
            <circle className="gw-lantern-flame" cx="30" cy="44" r="9" fill="#ffd75e" stroke="#2a2622" strokeWidth="2" />
        </svg>
    );
}

/* The carved vine — the divider trim, in the drawing style of the figures. */
function VineTrim() {
    return (
        <svg className="gw-vine" viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">
            <path
                d="M 0,9 Q 25,0 50,9 Q 75,18 100,9 Q 125,0 150,9 Q 175,18 200,9 Q 225,0 250,9 Q 275,18 300,9"
                fill="none" stroke="#6b4f2f" strokeWidth="2.5"
            />
            {[30, 90, 150, 210, 270].map((x, i) => (
                <path
                    key={x}
                    d={`M ${x},${i % 2 ? 13 : 5} q 4,${i % 2 ? 5 : -5} 9,${i % 2 ? 2 : -2} q -5,${i % 2 ? 3 : -3} -9,${i % 2 ? -2 : 2} Z`}
                    fill="#5a7a3a" stroke="#2a2622" strokeWidth="1.5"
                />
            ))}
        </svg>
    );
}

/* The mushroom ring along the floor — the way home. Keepsake-mushroom style,
   a family of caps in varied sizes. */
function MushroomRing() {
    const shrooms = [
        { x: 6, s: 1 }, { x: 34, s: 0.7 }, { x: 58, s: 0.85 },
        { x: 84, s: 0.6 }, { x: 108, s: 1.05 }, { x: 138, s: 0.75 },
        { x: 162, s: 0.9 }, { x: 190, s: 0.65 }, { x: 214, s: 1 },
    ];
    return (
        <svg className="gw-shroom-ring" viewBox="0 0 240 34" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            {shrooms.map((m, i) => (
                <g key={i} transform={`translate(${m.x}, ${34 - 30 * m.s}) scale(${m.s})`}>
                    <rect x="9" y="18" width="8" height="12" rx="3.5" fill="#f0e8d8" stroke="#2a2622" strokeWidth="2" />
                    <path d="M 2,20 Q 13,4 24,20 Z" fill="#c0392b" stroke="#2a2622" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="9" cy="14" r="1.8" fill="#f0e8d8" />
                    <circle cx="17" cy="16" r="1.4" fill="#f0e8d8" />
                </g>
            ))}
        </svg>
    );
}

/* Drifting spores — a handful of motes riding the lamplight (pure CSS float;
   stilled under reduced motion). */
function Spores() {
    return (
        <div className="gw-spores" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => <span key={i} className="gw-mote" />)}
        </div>
    );
}

function fmtAsk(v: number): string {
    return String(Number(v.toFixed(4)));
}

/* One hobbit door — a gnome standing in its round-top doorway. `mine` doors
   carry the sign controls; market doors show the keeper + the price. */
function GnomeDoor({
    g, mine, onSign,
}: {
    g: GnomeAwakening;
    mine: boolean;
    /** Hang (ask > 0) or take down (null) the sign — burrow wing only. */
    onSign?: (projectId: string, ask: number | null) => Promise<boolean>;
}) {
    const gnome = useMemo(() => projectGnome(g.project_id), [g.project_id]);
    const palette = useMemo(
        () => gnomePalette(gnome, projectColorway(g.project_id)),
        [gnome, g.project_id],
    );
    const projName = getProject(g.project_id)?.displayName ?? g.project_id.toUpperCase();

    /* Its own beat — same seeded rhythm discipline as the tab. */
    const rhythm = useMemo(() => {
        const h = hashString(`rhythm:${g.project_id.toLowerCase()}`);
        return { bob: -((h % 56) / 10), blink: -(((h >> 8) % 52) / 10) };
    }, [g.project_id]);

    /* Tap → it speaks. In your burrow you're their person (favoured);
       in the market you're a browsing stranger. */
    const [speech, setSpeech] = useState<string | null>(null);
    const tapCount = useRef(0);
    const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (speechTimer.current) clearTimeout(speechTimer.current); }, []);
    const [hop, setHop] = useState(false);
    const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (hopTimer.current) clearTimeout(hopTimer.current); }, []);
    const onTap = () => {
        setSpeech(gnomeGreeting(g.project_id, gnome.temperament, mine ? 'favoured' : 'stranger', tapCount.current++));
        if (speechTimer.current) clearTimeout(speechTimer.current);
        speechTimer.current = setTimeout(() => setSpeech(null), 4500);
        setHop(true);
        if (hopTimer.current) clearTimeout(hopTimer.current);
        hopTimer.current = setTimeout(() => setHop(false), 450);
    };

    /* The sign — inline ask entry (burrow only). */
    const [signing, setSigning] = useState(false);
    const [askDraft, setAskDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const submitSign = async () => {
        const v = Number(askDraft);
        if (!Number.isFinite(v) || v <= 0 || !onSign) return;
        setBusy(true);
        const ok = await onSign(g.project_id, Number(v.toFixed(4)));
        setBusy(false);
        if (ok) { setSigning(false); setAskDraft(''); }
    };
    const takeDown = async () => {
        if (!onSign) return;
        setBusy(true);
        await onSign(g.project_id, null);
        setBusy(false);
    };

    return (
        <div className="gw-door">
            <div className={`gw-door-rarity gw-r-${g.rarity.toLowerCase()}`}>{g.rarity}</div>
            <div className="gw-door-arch">
                <div className="gw-door-hinge gw-door-hinge-top" aria-hidden="true" />
                <div className="gw-door-hinge gw-door-hinge-low" aria-hidden="true" />
                <div className="gw-door-knob" aria-hidden="true" />
                <div
                    className="gw-door-stage"
                    role="button"
                    tabIndex={0}
                    title={mine ? 'Speak to your gnome' : 'Speak to the keeper'}
                    onClick={onTap}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
                >
                    {speech && <div className="gw-speech">{speech}</div>}
                    <div className={hop ? 'gnome-hop-wrap gnome-hop' : 'gnome-hop-wrap'}>
                        <GnomeFigure gnome={gnome} palette={palette} rhythm={rhythm} />
                    </div>
                </div>
            </div>

            <div className="gw-door-name">{gnome.name}</div>
            <div className="gw-door-proj">KEEPER OF {projName}</div>
            {!mine && (
                <div className="gw-door-keeper">
                    KEPT BY {gnomeEns(g.owner_handle) ?? shortGnomeAddress(g.owner_address)}
                </div>
            )}
            <div className="gw-door-fact">
                AWAKENED {fmtFeedDate(Date.parse(g.awakened_at))} · #{g.token_id} STRUCK THE HOUR
            </div>

            {/* The sign on the door. */}
            {g.ask_eth != null && (
                <div className="gw-sign">
                    <span className="gw-sign-rope" aria-hidden="true" />
                    FOR SALE · ◊{fmtAsk(g.ask_eth)}
                </div>
            )}

            {mine && !signing && (
                <div className="gw-door-actions">
                    {g.ask_eth == null ? (
                        <button type="button" className="gw-btn" onClick={() => setSigning(true)}>
                            HANG A SIGN
                        </button>
                    ) : (
                        <button type="button" className="gw-btn" disabled={busy} onClick={takeDown}>
                            TAKE THE SIGN DOWN
                        </button>
                    )}
                </div>
            )}
            {mine && signing && (
                <div className="gw-door-actions">
                    <input
                        className="gw-ask-input"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.001"
                        placeholder="◊ ask"
                        enterKeyHint="done"
                        value={askDraft}
                        onChange={(e) => setAskDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitSign(); }}
                    />
                    <button type="button" className="gw-btn" disabled={busy} onClick={submitSign}>
                        HANG IT
                    </button>
                    <button
                        type="button"
                        className="gw-btn gw-btn-quiet"
                        onClick={() => { setSigning(false); setAskDraft(''); }}
                    >
                        NEVER MIND
                    </button>
                </div>
            )}
        </div>
    );
}

export default function GnomeWalletModal() {
    const { openModal, close } = useModal();
    const { siweAddress, handle } = useAuth();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'gnomewallet';

    const [wing, setWing] = useState<Wing>('burrow');
    useEffect(() => { if (isOpen) setWing('burrow'); }, [isOpen]);

    const [gnomes, setGnomes] = useState<GnomeAwakening[] | null>(null);
    const loadMine = () => {
        if (!siweAddress) { setGnomes([]); return; }
        fetch(`/api/gnomes?address=${siweAddress.toLowerCase()}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d) setGnomes(Array.isArray(d.gnomes) ? d.gnomes : []); })
            .catch(() => setGnomes([]));
    };
    useEffect(() => {
        if (!isOpen) return;
        setGnomes(null);
        loadMine();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, siweAddress]);

    const [market, setMarket] = useState<GnomeAwakening[] | null>(null);
    useEffect(() => {
        if (!isOpen || wing !== 'market') return;
        let cancelled = false;
        setMarket(null);
        fetch('/api/gnomes/market', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setMarket(Array.isArray(d.listings) ? d.listings : []); })
            .catch(() => { if (!cancelled) setMarket([]); });
        return () => { cancelled = true; };
    }, [isOpen, wing]);

    /* Hang / take down the sign, then re-read the burrow. */
    const onSign = async (projectId: string, ask: number | null): Promise<boolean> => {
        try {
            const r = await fetch('/api/gnomes/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, ask_eth: ask }),
            });
            if (!r.ok) { showToast('Gnome: SIGN TROUBLE'); return false; }
            showToast(ask == null ? 'Gnome: SIGN DOWN' : `Gnome: SIGN HUNG · ◊${fmtAsk(ask)}`);
            loadMine();
            return true;
        } catch {
            showToast('Gnome: SIGN TROUBLE');
            return false;
        }
    };

    const ens = gnomeEns(handle);

    return (
        <div
            className={`gw-backdrop${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="gnomewallet"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="gw-sheet" onClick={(e) => e.stopPropagation()}>
                <Spores />
                <div
                    className="gw-close"
                    role="button"
                    tabIndex={0}
                    title="Back through the mushroom"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                >
                    {`×${VS15}`}
                </div>

                <div className="gw-head">
                    <HallLantern />
                    <div className="gw-shingle">
                        <span className="gw-shingle-rope gw-shingle-rope-l" aria-hidden="true" />
                        <span className="gw-shingle-rope gw-shingle-rope-r" aria-hidden="true" />
                        <span className="gw-shingle-word">
                            {`${GNOME_GLYPH}${VS15}`} gnomewallet {`${GNOME_GLYPH}${VS15}`}
                        </span>
                    </div>
                    <span className="gw-head-tag">&ldquo;{GNOME_TAGLINE}&rdquo;</span>
                </div>

                {siweAddress && (
                    <div className="gw-identity">
                        {ens && <span className="gw-ens">{ens}</span>}
                        <span className="gw-addr">{gnomeAddress(siweAddress)}</span>
                        <span className="gw-count">
                            {gnomes ? `${gnomes.length} ${gnomes.length === 1 ? 'GNOME' : 'GNOMES'} IN YOUR KEEPING` : ''}
                        </span>
                    </div>
                )}

                {/* The signposts — the two wings of the hall. */}
                <div className="gw-wings">
                    <button
                        type="button"
                        className={`gw-wing-post${wing === 'burrow' ? ' gw-wing-on' : ''}`}
                        onClick={() => setWing('burrow')}
                    >
                        my burrow
                    </button>
                    <button
                        type="button"
                        className={`gw-wing-post${wing === 'market' ? ' gw-wing-on' : ''}`}
                        onClick={() => setWing('market')}
                    >
                        {GNOME_MARKET_NAME}
                    </button>
                </div>

                <VineTrim />

                {wing === 'burrow' ? (
                    !siweAddress ? (
                        <div className="gw-empty">The hill doesn&rsquo;t open for nameless folk. Connect your wallet.</div>
                    ) : gnomes === null ? (
                        <div className="gw-empty">Lighting the lamps…</div>
                    ) : gnomes.length === 0 ? (
                        <div className="gw-empty">
                            No gnomes in your keeping yet. One wakes when your mint strikes a
                            project&rsquo;s hidden hour — keep mining.
                        </div>
                    ) : (
                        <div className="gw-grid">
                            {gnomes.map((g) => <GnomeDoor key={g.project_id} g={g} mine onSign={onSign} />)}
                        </div>
                    )
                ) : market === null ? (
                    <div className="gw-empty">Sweeping the market floor…</div>
                ) : market.length === 0 ? (
                    <div className="gw-empty">
                        No signs hung today. When a keeper lists a gnome, its door stands here.
                    </div>
                ) : (
                    <div className="gw-grid">
                        {market.map((g) => (
                            <GnomeDoor key={g.project_id} g={g} mine={false} />
                        ))}
                    </div>
                )}

                <MushroomRing />
                <div className="gw-foot">GNOMENCLATURE VERIFIED · THE HILL KEEPS ITS OWN LEDGER</div>
            </div>
        </div>
    );
}
