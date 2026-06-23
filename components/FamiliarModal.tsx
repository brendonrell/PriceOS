'use client';

/*
 * FamiliarModal — the Digital Familiar's home / bestiary ("Price-a-gotchi").
 *
 * Opened from clicking the floating Familiar sprite (Backgrounds.tsx onClick →
 * ModalContext.open('familiar')). Rides the platform-modal scaffold like the
 * PriceSprite modal.
 *
 * Body is a collection screen (lib/familiar/bestiary): a live hero of the
 * wallet's current companion, then the four tiers as a videogame-style
 * collection — BitDaemons revealed (the current one badged YOURS), the rarer
 * Titans / Ascended / Old Gods shown LOCKED with their unlock condition so
 * the player knows there's more to earn. Honest about what's wired: only the
 * 5 BitDaemons are live; the rarer rosters land with their normalized art.
 *
 * Hero syncs to familiarEngine frames while open (same approach as the
 * PriceSprite hero). Title stamps the live species name (sim 12942-12946).
 */

import { useEffect, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import {
    getFamiliarFrame,
    getFamiliarSpeciesName,
    setFamiliarSpecies,
    getFamiliarOmniscience,
    setFamiliarOmniscience,
    getFamiliarOutline,
    setFamiliarOutline,
    getFamiliarEnergy,
    setFamiliarEnergy,
    subscribeFamiliar,
    type FamiliarFrame,
} from '../lib/engines/familiarEngine';
import { TIERS } from '../lib/familiar/bestiary';
import { useDragScrollAll } from '../lib/hooks/useDragScroll';

const VS15 = '︎';

/* Outline colour choices for the Customize section — the vivid PD palette. */
const OUTLINE_SWATCHES = ['#FF0055', '#FFE600', '#00FFD1', '#9D00FF', '#FF8A00', '#FFFFFF'];

/* Energy / movement moods. 'chill' is the calm default (stays in the corner). */
const ENERGY_OPTIONS: { id: string; label: string }[] = [
    { id: 'chill', label: 'Chill' },
    { id: 'active', label: 'Active' },
    { id: 'hyped', label: 'Hyped' },
    { id: 'greed', label: 'Greed' },
    { id: 'fear', label: 'Fear' },
    { id: 'ngmi', label: 'NGMI' },
    { id: 'wagmi', label: 'WAGMI' },
    { id: 'fomo', label: 'FOMO' },
    { id: 'cope', label: 'Cope' },
];

export default function FamiliarModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const { update } = usePdNotifs();
    const isOpen = openModal?.name === 'familiar';

    const [title, setTitle] = useState('FAMILIAR');
    const [species, setSpecies] = useState('');
    const [omni, setOmni] = useState(true);
    const [outline, setOutline] = useState('random');
    const [energy, setEnergy] = useState('chill');

    /* Desktop mouse drag-to-scroll on every tier rail (touch scrolls natively).
       Attached to the body that already contains all rails at mount. */
    const railsRef = useDragScrollAll<HTMLDivElement>('.fam-rail');

    /* Live hero — mirror the floating Familiar's frame while the modal is
       open. Subscribe only while open; the engine drives the 600ms tick. */
    const [frame, setFrame] = useState<FamiliarFrame>(() => getFamiliarFrame());
    useEffect(() => {
        if (!isOpen) return;
        const name = getFamiliarSpeciesName();
        setSpecies(name);
        setTitle(name ? `FAMILIAR · ${name.toUpperCase()}` : 'FAMILIAR');
        setFrame(getFamiliarFrame());
        setOmni(getFamiliarOmniscience());
        setOutline(getFamiliarOutline());
        setEnergy(getFamiliarEnergy());
        return subscribeFamiliar((f) => setFrame(f));
    }, [isOpen]);

    const heroText = frame.spriteText || '( ◎ )';

    /* Collection tally — videogame "X / N" header. Discovered = the revealed
       (BitDaemon) entries; total includes the rarer tiers' hidden slots. */
    const total = TIERS.reduce((n, t) => n + t.entries.length, 0);
    const discovered = TIERS.reduce(
        (n, t) => n + (t.locked ? 0 : t.entries.length),
        0,
    );

    return (
        <div
            id="familiarModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                title="Close"
            >
                {`×${VS15}`}
            </div>

            <div className="modal-info fam-body" ref={railsRef}>
                <div
                    className="modal-title fam-reveal fam-d1"
                    id="familiarModalTitle"
                    style={{ marginBottom: 4 }}
                >
                    {title}
                </div>

                {/* Hero — the live companion, floating. Top tier (Old Gods)
                    renders bigger for boss-scale presence. */}
                <div
                    className="fam-hero fam-reveal fam-d2"
                    data-tier={frame.tier ?? ''}
                    aria-hidden="true"
                >
                    <span className="fam-hero-float">
                        <span className="fam-hero-sprite">{heroText}</span>
                    </span>
                </div>
                <div className="fam-hero-caption fam-reveal fam-d2">
                    {species ? `${species} · your companion` : 'your companion'}
                </div>

                <div className="fam-tally fam-reveal fam-d2">
                    <span>
                        <b>{discovered}</b> / {total} DISCOVERED
                    </span>
                    <span className="fam-tally-tiers">{TIERS.length} TIERS</span>
                </div>

                {/* Omniscience — when on, the familiar weaves in facts pulled
                    live from your own record (hold times, sells, streak…). Off
                    keeps it to personality + generic chatter (Brendon, 2026-06-22). */}
                <button
                    type="button"
                    className={`fam-omni fam-reveal fam-d2${omni ? ' on' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        const next = !omni;
                        setOmni(next);
                        setFamiliarOmniscience(next);
                        showToast(`Omniscience: ${next ? 'ON' : 'OFF'}`);
                    }}
                    aria-pressed={omni}
                >
                    <span className="fam-omni-label">Omniscience</span>
                    <span className="fam-omni-state">{omni ? 'ON' : 'OFF'}</span>
                </button>
                {/* Customize — decorate your familiar. Outline now; accessories
                    to follow (Brendon, 2026-06-22). */}
                <div className="fam-section-label fam-reveal fam-d2">CUSTOMIZE</div>
                <div className="fam-custom-row fam-reveal fam-d2">
                    <span className="fam-custom-label">Outline</span>
                    <div className="fam-outline-chips">
                        <button
                            type="button"
                            className={`fam-chip${outline === 'off' ? ' on' : ''}`}
                            title="No outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOutline('off');
                                setFamiliarOutline('off');
                                showToast('Outline: OFF');
                            }}
                        >
                            ✕
                        </button>
                        <button
                            type="button"
                            className={`fam-chip${outline === 'random' ? ' on' : ''}`}
                            title="Random"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOutline('random');
                                setFamiliarOutline('random');
                                showToast('Outline: RANDOM');
                            }}
                        >
                            ⟳
                        </button>
                        {OUTLINE_SWATCHES.map((hex) => (
                            <button
                                type="button"
                                key={hex}
                                className={`fam-chip fam-swatch${outline.toLowerCase() === hex.toLowerCase() ? ' on' : ''}`}
                                style={{ background: hex }}
                                title={hex}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOutline(hex);
                                    setFamiliarOutline(hex);
                                    showToast('Outline: SET');
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="fam-custom-row fam-reveal fam-d2">
                    <span className="fam-custom-label">Energy</span>
                    <div className="fam-energy-chips">
                        {ENERGY_OPTIONS.map((opt) => (
                            <button
                                type="button"
                                key={opt.id}
                                className={`fam-energy-chip${energy === opt.id ? ' on' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEnergy(opt.id);
                                    setFamiliarEnergy(opt.id);
                                    showToast(`Energy: ${opt.label.toUpperCase()}`);
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* The four tiers — a collection you fill by playing. */}
                {TIERS.map((tier, ti) => {
                    const dClass = `fam-d${Math.min(ti + 3, 6)}`;
                    return (
                        <div className={`fam-tier fam-reveal ${dClass}`} key={tier.id}>
                            <div className="fam-tier-header">
                                <span className="fam-tier-label">{tier.label}</span>
                                <span className="fam-tier-rarity">
                                    {`${tier.locked ? 'LOCKED' : tier.rarity} · ${tier.entries.length}`}
                                </span>
                            </div>

                            <div className="fam-rail">
                                {tier.entries.map((sp) => {
                                    const yours = !tier.locked && sp.name === species;
                                    return (
                                        <button
                                            className={`fam-tile${tier.locked ? ' locked' : ''}${yours ? ' yours' : ''}`}
                                            type="button"
                                            data-tier={tier.id}
                                            key={sp.name}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (tier.locked) {
                                                    showToast(`${tier.label.toUpperCase()}: ${tier.unlock}`);
                                                    return;
                                                }
                                                if (yours) {
                                                    showToast(`${sp.name.toUpperCase()}: YOURS`);
                                                    return;
                                                }
                                                /* Pick this BitDaemon as the live companion —
                                                   updates the floating sprite + this modal now
                                                   and persists the choice (Brendon, 2026-06-16). */
                                                setFamiliarSpecies(sp.name);
                                                setSpecies(sp.name);
                                                setTitle(`FAMILIAR · ${sp.name.toUpperCase()}`);
                                                showToast(`Familiar: ${sp.name.toUpperCase()}`);
                                            }}
                                        >
                                            {tier.locked && (
                                                <span className="fam-tile-badge">LOCKED</span>
                                            )}
                                            <span className="fam-tile-art">{sp.art}</span>
                                            <span className="fam-tile-name">
                                                {yours ? 'YOURS' : sp.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {tier.locked && (
                                <div className="fam-unlock-note">{tier.unlock}</div>
                            )}
                        </div>
                    );
                })}

                <button
                    type="button"
                    className="fam-off-btn fam-reveal fam-d6"
                    onClick={(e) => {
                        e.stopPropagation();
                        update({ spell_familiar: false });
                        showToast('Familiar: OFF');
                        close();
                    }}
                >
                    Turn off Familiar
                </button>
                <div className="fam-foot fam-reveal fam-d6">
                    re-enable any time in the Spell Book
                </div>
            </div>
        </div>
    );
}
