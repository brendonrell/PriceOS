'use client';

/*
 * GnomeWalletModal — the GNOMEWALLET (Brendon, 2026-07-19).
 *
 * The other-world wallet of the gnome pfp collection: launched from the
 * settings Wallet row (the pill beside Fiat) once you keep your first gnome.
 * Deliberately themed like the gnomes and NOT the platform — stepping in is
 * the magic-mushroom trip into gnome trading world, so the surface wears its
 * own earth-and-lamplight palette (a Brendon-approved pinned-theme surface,
 * like the Composer's dark: never "fix" it back to colorway).
 *
 * Shows every gnome this wallet has awakened (its mint struck the project's
 * hidden waking hour): the figure, the gnomenclature (your 6n0m3… address +
 * name.gnome), rarity, and the awakening record. Trading comes next.
 *
 * Mounted once in PriceOSShell; rides ModalContext (Tarot precedent).
 */

import { useEffect, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { getProject, projectColorway } from '../lib/project/registry';
import { projectGnome, gnomePalette } from '../lib/project/gnome';
import {
    GNOME_GLYPH, GNOME_TAGLINE, gnomeAddress, gnomeEns, shortGnomeAddress,
    type GnomeAwakening,
} from '../lib/project/gnomeWorld';
import { fmtFeedDate } from './profile/profilePageShared';
import { GnomeFigure } from './project/GnomePanel';

const VS15 = '︎';

function GnomeCard({ g }: { g: GnomeAwakening }) {
    const gnome = projectGnome(g.project_id);
    const palette = gnomePalette(gnome, projectColorway(g.project_id));
    const projName = getProject(g.project_id)?.displayName ?? g.project_id.toUpperCase();
    return (
        <div className="gw-card">
            <div className={`gw-card-rarity gw-r-${g.rarity.toLowerCase()}`}>{g.rarity}</div>
            <div className="gw-card-stage">
                <GnomeFigure gnome={gnome} palette={palette} />
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
                    <span className="gw-head-glyph">{`${GNOME_GLYPH}${VS15}`}</span>
                    <span className="gw-head-title">GNOMEWALLET</span>
                    <span className="gw-head-tag">{GNOME_TAGLINE}</span>
                </div>

                {siweAddress && (
                    <div className="gw-identity">
                        {ens && <span className="gw-ens">{ens}</span>}
                        <span className="gw-addr">{siweAddress ? gnomeAddress(siweAddress) : ''}</span>
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

                <div className="gw-foot">GNOMENCLATURE VERIFIED · THE HILL KEEPS ITS OWN LEDGER</div>
            </div>
        </div>
    );
}
