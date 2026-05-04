'use client';

/*
 * SpellBookSection
 *
 * Replaces the "MY PD" content (and rows below the wallet, except the
 * workspace switcher) when the Spell Book is active.
 *
 * The 21 pills land in two flex-wrap rows by virtue of the .spell-book-
 * pills CSS rule. Each pill toggles its pdNotifs.spell_* flag. Visual
 * effects of each spell (Familiar visibility, Stargazing background,
 * etc.) are read by downstream components which already exist (e.g.
 * the starfield / familiar mounts in PriceOSShell are gated on these
 * flags) or will land in their respective steps.
 *
 * Header itself accepts triple-tap → swap back to MY PD view.
 */

import { useRef } from 'react';
import { usePdNotifs } from '../../../lib/state/PdNotifsContext';
import { useModal } from '../../../lib/state/ModalContext';
import { SettingsToggle } from './SettingsToggle';
import { SPELLS } from '../../../lib/data/spells';

interface Props {
    onTripleTap: () => void;
}

export function SpellBookSection({ onTripleTap }: Props) {
    const { notifs, toggle } = usePdNotifs();
    const { open: openModal } = useModal();
    const tapState = useRef<{ count: number; lastTap: number }>({
        count: 0,
        lastTap: 0,
    });

    const handleHeaderTap = () => {
        const now = Date.now();
        const s = tapState.current;
        if (now - s.lastTap > 600) {
            s.count = 1;
        } else {
            s.count += 1;
        }
        s.lastTap = now;
        if (s.count >= 3) {
            s.count = 0;
            onTripleTap();
        }
    };

    return (
        <>
            <div
                className="settings-header"
                style={{ cursor: 'default', userSelect: 'none' }}
                onClick={handleHeaderTap}
                title="Triple-tap to return to MY PD"
            >
                SPELL BOOK
            </div>
            <div className="spell-book-pills">
                {SPELLS.map((spell) => (
                    <SettingsToggle
                        key={spell.id}
                        id={`sb-${spell.id}`}
                        active={notifs[spell.flag]}
                        onClick={
                            /* Build 5: the Familiar pill click opens the
                               Familiar modal instead of toggling the spell.
                               Sim opens the modal from the floating familiar
                               sprite (sim 12879), but that sprite isn't
                               ported yet, so the pill is the entry point.
                               Every other pill keeps the standard toggle
                               behavior. */
                            spell.id === 'familiar'
                                ? () => openModal('familiar')
                                : () => toggle(spell.flag)
                        }
                        icon={spell.icon}
                        iconStyle={{
                            ...(spell.iconStyle?.fontSize  ? { fontSize: spell.iconStyle.fontSize } : {}),
                            ...(spell.iconStyle?.lineHeight ? { lineHeight: spell.iconStyle.lineHeight } : {}),
                            ...(spell.iconStyle?.top
                                ? { position: 'relative', top: spell.iconStyle.top }
                                : {}),
                        }}
                        sharp={spell.sharp}
                        label={spell.name}
                    />
                ))}
            </div>
        </>
    );
}
