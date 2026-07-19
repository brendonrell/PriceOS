'use client';

/*
 * GnomeWalletModal — the GNOMEWALLET (Brendon, 2026-07-19).
 *
 * YOUR side of the gnome world: the tab is the gnome's home; this modal is
 * the keeper's own wallet — an entire other world behind the settings pill
 * (beside Fiat, revealed by your first gnome). Deliberately themed like the
 * gnomes and NOT the platform — stepping in is the magic-mushroom trip into
 * gnome pfp trading world (a Brendon-approved pinned-theme surface, like the
 * Composer's dark: never "fix" it back to colorway).
 *
 * The charm (Brendon: "extra gnome charm"): a swaying lantern lights the
 * door, spores drift, a mushroom ring grows along the floor, and every gnome
 * in your keeping breathes on its own beat and SPEAKS when tapped — the
 * favoured greeting, because in here you're their person.
 *
 * Shows every gnome this wallet has awakened (its mint struck the project's
 * hidden waking hour): the figure, the gnomenclature (your 6n0m3… address +
 * name.gnome), rarity, and the awakening record. Trading comes next.
 *
 * Mounted once in PriceOSShell; rides ModalContext (Tarot precedent).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { getProject, projectColorway } from '../lib/project/registry';
import { projectGnome, gnomePalette } from '../lib/project/gnome';
import { gnomeGreeting } from '../lib/project/gnomeVoice';
import {
    GNOME_GLYPH, GNOME_TAGLINE, gnomeAddress, gnomeEns, shortGnomeAddress,
    type GnomeAwakening,
} from '../lib/project/gnomeWorld';
import { hashString } from '../lib/art/rng';
import { fmtFeedDate } from './profile/profilePageShared';
import { GnomeFigure } from './project/GnomePanel';

const VS15 = '︎';

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

function GnomeCard({ g }: { g: GnomeAwakening }) {
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

    /* Tap → it speaks. In here you're their person: the favoured greeting. */
    const [speech, setSpeech] = useState<string | null>(null);
    const tapCount = useRef(0);
    const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (speechTimer.current) clearTimeout(speechTimer.current); }, []);
    const [hop, setHop] = useState(false);
    const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (hopTimer.current) clearTimeout(hopTimer.current); }, []);
    const onTap = () => {
        setSpeech(gnomeGreeting(g.project_id, gnome.temperament, 'favoured', tapCount.current++));
        if (speechTimer.current) clearTimeout(speechTimer.current);
        speechTimer.current = setTimeout(() => setSpeech(null), 4500);
        setHop(true);
        if (hopTimer.current) clearTimeout(hopTimer.current);
        hopTimer.current = setTimeout(() => setHop(false), 450);
    };

    return (
        <div className="gw-card">
            <div className={`gw-card-rarity gw-r-${g.rarity.toLowerCase()}`}>{g.rarity}</div>
            <div
                className="gw-card-stage"
                role="button"
                tabIndex={0}
                title="Speak to your gnome"
                onClick={onTap}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
            >
                {speech && <div className="gw-speech">{speech}</div>}
                <div className={hop ? 'gnome-hop-wrap gnome-hop' : 'gnome-hop-wrap'}>
                    <GnomeFigure gnome={gnome} palette={palette} rhythm={rhythm} />
                </div>
            </div>
            <div className="gw-card-name">{gnome.name}</div>
            <div className="gw-card-proj">KEEPER OF {projName}</div>
            <div className="gw-card-fact">
                AWAKENED {fmtFeedDate(Date.parse(g.awakened_at))} · #{g.token_id} STRUCK THE HOUR
            </div>
        </div>
    );
}

export default function GnomeWalletModal() {
    const { openModal, close } = useModal();
    const { siweAddress, handle } = useAuth();
    const isOpen = openModal?.name === 'gnomewallet';

    const [gnomes, setGnomes] = useState<GnomeAwakening[] | null>(null);
    useEffect(() => {
        if (!isOpen) return;
        if (!siweAddress) { setGnomes([]); return; }
        let cancelled = false;
        setGnomes(null);
        fetch(`/api/gnomes?address=${siweAddress.toLowerCase()}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setGnomes(Array.isArray(d.gnomes) ? d.gnomes : []); })
            .catch(() => { if (!cancelled) setGnomes([]); });
        return () => { cancelled = true; };
    }, [isOpen, siweAddress]);

    const ens = gnomeEns(handle);

    return (
        <div
            className={`gw-backdrop${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Gnomewallet"
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
                    <span className="gw-head-title">{`${GNOME_GLYPH}${VS15}`} GNOMEWALLET {`${GNOME_GLYPH}${VS15}`}</span>
                    <span className="gw-head-tag">{GNOME_TAGLINE}</span>
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

                {!siweAddress ? (
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
                        {gnomes.map((g) => <GnomeCard key={g.project_id} g={g} />)}
                    </div>
                )}

                <MushroomRing />
                <div className="gw-foot">GNOMENCLATURE VERIFIED · THE HILL KEEPS ITS OWN LEDGER</div>
            </div>
        </div>
    );
}
