'use client';

/*
 * SettingsView
 *
 * The full Settings panel that swaps in for LinksView when the user
 * clicks Settings in the Connect Menu. Composes:
 *
 *   ← Back row
 *   WALLET section (always visible)
 *   ── divider ──
 *   IF spellBookActive:
 *     SPELL BOOK section
 *   ELSE:
 *     MY PD section + divider + DEFAULT THEME + divider + DEFAULT SORT
 *     + divider + MY PINGS
 *   ── (no divider) ──
 *   WORKSPACE SWITCHER (always visible at the bottom)
 *
 * Triple-tap on the MY PD header flips into Spell Book view; triple-tap
 * on the SPELL BOOK header flips back. Closing the menu (or backing out
 * to the links view) resets to MY PD view.
 *
 * Replaces the placeholder shipped in step 3.
 */

import { useState } from 'react';
import { useDropdown } from '../../../lib/state/DropdownContext';
import { WalletSection } from './WalletSection';
import { MyPdSection } from './MyPdSection';
import { ThemePicker } from './ThemePicker';
import { DefaultSortRow } from './DefaultSortRow';
import { MyPingsRow } from './MyPingsRow';
import { SpellBookSection } from './SpellBookSection';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function SettingsView() {
    const { setView } = useDropdown();
    const [spellBookActive, setSpellBookActive] = useState(false);

    return (
        <div className="settings-panel" id="settingsPanel">
            <div
                className="scroll-arrow"
                role="button"
                tabIndex={0}
                title="Back"
                style={{ padding: '4px 10px 0 10px', fontSize: '18px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    setSpellBookActive(false);
                    setView('links');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSpellBookActive(false);
                        setView('links');
                    }
                }}
            >
                ←{'\uFE0E'}
            </div>

            <WalletSection />

            <div className="dropdown-divider" />

            {spellBookActive ? (
                <SpellBookSection onTripleTap={() => setSpellBookActive(false)} />
            ) : (
                <>
                    <MyPdSection onTripleTap={() => setSpellBookActive(true)} />
                    <div className="dropdown-divider" />
                    <ThemePicker />
                    <div className="dropdown-divider" />
                    <DefaultSortRow />
                    <div className="dropdown-divider" />
                    <MyPingsRow />
                </>
            )}

            <WorkspaceSwitcher />
        </div>
    );
}
