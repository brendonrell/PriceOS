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
 *     MY PD section + divider + DEFAULT COLORWAY + divider + DEFAULT SORT
 *     + divider + MY PINGS
 *   ── (no divider) ──
 *   WORKSPACE SWITCHER (always visible at the bottom)
 *
 * Triple-tap on the MY PD header flips into Spell Book view; triple-tap
 * on the SPELL BOOK header flips back. Closing the menu (or backing out
 * to the links view) resets to MY PD view.
 *
 * Replaces the placeholder shipped in step 3.
 *
 * S4 page 3234 — Spell Book height pin (sim 12656-12685, sim carve-out):
 *   When MyPdSection is mounted (spellBookActive === false), measure
 *   #settingsPanel.offsetHeight on every layout pass and track the max
 *   ever seen. When Spell Book activates, apply that captured height
 *   as the panel's minHeight so the dropdown doesn't shrink to the
 *   Spell Book's smaller natural footprint. Releases on flip-back to
 *   MyPdSection so the panel resizes naturally to its current content.
 *   Sim's globally-scoped _settingsPanelFullHeight is replaced here
 *   with component-local state (lives for the lifetime of the
 *   SettingsView mount — matches sim behaviour since sim's variable
 *   also persists for the page session). useLayoutEffect captures
 *   pre-paint so the pin lands without a one-frame shrink-then-grow.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { useDropdown } from '../../../lib/state/DropdownContext';
import { WalletSection } from './WalletSection';
import { MyPdSection } from './MyPdSection';
import { ColorwayPicker } from './ColorwayPicker';
import { DefaultSortRow } from './DefaultSortRow';
import { ShareViewRow } from './ShareViewRow';
import { MyPingsRow } from './MyPingsRow';
import { SpellBookSection } from './SpellBookSection';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function SettingsView() {
    const { setView } = useDropdown();
    const [spellBookActive, setSpellBookActive] = useState(false);

    /* Sim 12655-12685 port — capture #settingsPanel's natural height
       while MyPdSection is visible; track the max ever seen; apply as
       minHeight while Spell Book is active. Deps [spellBookActive,
       pinnedMinHeight] make the effect converge in ≤ 2 renders: first
       run sets the captured height, second run sees h <= pinned and
       no-ops. */
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [pinnedMinHeight, setPinnedMinHeight] = useState<number>(0);

    useLayoutEffect(() => {
        if (spellBookActive) return;
        const panel = panelRef.current;
        if (!panel) return;
        const h = panel.offsetHeight;
        if (h > pinnedMinHeight) setPinnedMinHeight(h);
    }, [spellBookActive, pinnedMinHeight]);

    const panelStyle =
        spellBookActive && pinnedMinHeight > 0
            ? { minHeight: `${pinnedMinHeight}px` }
            : undefined;

    return (
        <div
            ref={panelRef}
            className="settings-panel"
            id="settingsPanel"
            style={panelStyle}
        >
            <div className="settings-scroll-body">
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
                        <ColorwayPicker />
                        <div className="dropdown-divider" />
                        <DefaultSortRow />
                        <div className="dropdown-divider" />
                        <ShareViewRow />
                        <div className="dropdown-divider" />
                        <MyPingsRow />
                    </>
                )}
            </div>

            <WorkspaceSwitcher />
        </div>
    );
}
