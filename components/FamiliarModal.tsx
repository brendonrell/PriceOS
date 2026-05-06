'use client';

/*
 * FamiliarModal
 *
 * Sim id #familiarModal — sim.html 4274–4283. Opened from the
 * Digital Familiar sprite click via Backgrounds.tsx onClick →
 * ModalContext.open('familiar'). Sim handles this through a
 * document-level capture-phase listener at sim 12877-12886; the
 * React port owns the host JSX, so a direct onClick is cleaner.
 *
 * Sim refs:
 *   markup ............. sim.html 4274–4283 (placeholder copy)
 *   open/close ......... sim.html 12938–12954
 *   species name ....... sim.html 12890 (window._getFamiliarSpeciesName)
 *
 * Surface is a minimal placeholder — the title stamps in the species
 * name on open ("FAMILIAR · STARLING" etc.) per sim 12942-12946; the
 * body lists the four future settings (species/dialogue/outline/
 * placement). No state of its own beyond the title sync; ModalContext
 * gates open/close via the union name 'familiar'.
 *
 * Batch G / F56 / BUG-23 — title sync:
 *   useEffect on isOpen calls getFamiliarSpeciesName() and stamps
 *   `FAMILIAR · {NAME}` into the title. When the spell is off and
 *   the modal is somehow opened, the title falls back to plain
 *   "FAMILIAR" (matches sim's `name ? ... : 'FAMILIAR'` ternary).
 */

import { useEffect, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { getFamiliarSpeciesName } from '../lib/engines/familiarEngine';

const VS15 = '\uFE0E';

export default function FamiliarModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'familiar';
    const [title, setTitle] = useState('FAMILIAR');

    /* Sim 12942-12946: read the live species name when the modal
       opens and stamp it into the title. No subscription needed —
       species is sticky for the page lifetime per the engine's
       _speciesPicked guard, so a single read on open is enough. */
    useEffect(() => {
        if (!isOpen) return;
        const name = getFamiliarSpeciesName();
        setTitle(name ? `FAMILIAR · ${name.toUpperCase()}` : 'FAMILIAR');
    }, [isOpen]);

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
                {`\u00D7${VS15}`}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 420, width: '100%' }}
            >
                <div
                    className="modal-title"
                    id="familiarModalTitle"
                    style={{ marginBottom: 14 }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: 13,
                        letterSpacing: '0.5px',
                        opacity: 0.7,
                        lineHeight: 1.7,
                        textAlign: 'left',
                        padding: '0 20px',
                    }}
                >
                    Settings coming soon.
                    <br />
                    <br />
                    <span style={{ opacity: 0.55 }}>
                        · Species picker
                        <br />
                        · Dialogue frequency
                        <br />
                        · Outline toggle
                        <br />
                        · Placement
                    </span>
                </div>
            </div>
        </div>
    );
}
