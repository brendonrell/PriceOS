'use client';

/*
 * FamiliarModal
 *
 * Sim id #familiarModal — sim.html 4274–4283. Opened from the actual
 * Digital Familiar sprite click in sim (handleClick at 12879); since the
 * floating familiar isn't ported yet, Build 5 routes the opener through
 * the Spell Book's Familiar pill instead (per build instructions).
 *
 * Sim refs:
 *   markup ............. sim.html 4274–4283 (placeholder copy)
 *   open/close ......... sim.html 12938–12954
 *   species name ....... sim.html 12890 (window._getFamiliarSpeciesName)
 *
 * Surface is a minimal placeholder — the title stamps in the species name
 * once the familiar engine lands ("FAMILIAR · STARLING" etc.); the body
 * lists the four future settings (species/dialogue/outline/placement).
 * No state of its own; ModalContext gates open/close via the union name
 * 'familiar'.
 */

import { useModal } from '../lib/state/ModalContext';

const VS15 = '\uFE0E';

export default function FamiliarModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'familiar';

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
                    FAMILIAR
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
