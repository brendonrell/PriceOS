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

import { useEffect, useRef, useState } from 'react';
import { usePdNotifs } from '../../../lib/state/PdNotifsContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useSort } from '../../../lib/state/SortContext';
import { useModal } from '../../../lib/state/ModalContext';
import { SettingsToggle } from './SettingsToggle';
import { SPELLS } from '../../../lib/data/spells';

interface Props {
    onTripleTap: () => void;
}

export function SpellBookSection({ onTripleTap }: Props) {
    const { notifs, toggle } = usePdNotifs();
    const { showToast } = useToast();
    const { setSort } = useSort();
    const { open } = useModal();
    const tapState = useRef<{ count: number; lastTap: number }>({
        count: 0,
        lastTap: 0,
    });

    /* Build 32 D21 — hammer-badge counter (sim 4759 + 7262-7271). The
       Hammer pill carries an inline badge that displays the number of
       muted items. Source of truth is `pd_hammer_count` in localStorage,
       written by sim's `_persistMuted` (sim 7258-7261) — the Mute UI
       hasn't been ported yet, so the count will be 0 in practice until
       the mute surfaces land in a later build. The pattern mirrors
       Build 31's anchor sync (page.tsx 326-355): read on mount, listen
       to `pd:hammer-count-changed` window events for live updates from
       any future mute caller. SSR-safe via useEffect mount.

       Display format follows sim exactly — bare integer (`badge.textContent
       = _hammerCount`, sim 7266) — not the "×N" multiplier shorthand. The
       `.hammer-badge` styling lives in globals.css (sim 4759 inline → CSS
       class). Badge renders only when count > 0, matching sim's
       `display:none / ''` toggle. */
    const [hammerCount, setHammerCount] = useState(0);
    useEffect(() => {
        const sync = () => {
            try {
                const raw = window.localStorage.getItem('pd_hammer_count');
                const n = raw == null ? 0 : parseInt(raw, 10);
                setHammerCount(Number.isFinite(n) && n > 0 ? n : 0);
            } catch {
                setHammerCount(0);
            }
        };
        sync();
        window.addEventListener('pd:hammer-count-changed', sync);
        return () => {
            window.removeEventListener('pd:hammer-count-changed', sync);
        };
    }, []);

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

    /* Build 29 D28 — every spell flip emits a `<spell.name> ON|OFF`
       toast on click. Mirrors sim 12700:
         showToast(`${spellNames[key] || key}: ${on ? 'ON' : 'OFF'}`);

       Batch G / F56 — the Familiar pill now follows this same path.
       Earlier builds routed the Familiar pill straight to the modal
       because the floating sprite engine wasn't ported; F56 lands
       the engine, so the pill returns to its sim role: TOGGLE the
       spell, and the modal opens from clicking the floating sprite
       itself (sim 12879, ported via Backgrounds.tsx onClick). */
    const toggleSpellWithToast = (spell: typeof SPELLS[number]) => {
        const next = !notifs[spell.flag];
        toggle(spell.flag);
        // Cartel gets its own flavour on (off stays the plain label).
        if (spell.id === 'cartel') {
            showToast(next ? '⟁ You + Your Mutuals = The Cabal ⟁' : 'Cartel: OFF');
            return;
        }
        // Celestial Tracker — flavour on, plain off.
        if (spell.id === 'celestial') {
            showToast(next ? '☽ Reading the Birth Skies ☽' : 'Celestial Tracker: OFF');
            return;
        }
        showToast(`${spell.name}: ${next ? 'ON' : 'OFF'}`);
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
                {/* Spells 1–11: familiar → price ghost (incl. the icon-less NPC
                    pill after Deactivate; Solar Flare + Portal retired). */}
                {SPELLS.slice(0, 11).map((spell) => (
                    <SettingsToggle
                        key={spell.id}
                        id={`sb-${spell.id}`}
                        active={notifs[spell.flag]}
                        /* Spite Book opens its book modal instead of flipping a
                           flag (Familiar-pill precedent — the pill drives a
                           surface, not a body class). */
                        onClick={() =>
                            spell.id === 'spitebook'
                                ? open('spiteBook')
                                : toggleSpellWithToast(spell)
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
                {/* Redacted — moved here from MY PD (Brendon, 2026-06-18), taking
                    the retired Portal slot. Plain `redactedMode` flag (not
                    spell_*), so it's a hardcoded pill like Stargazing / Echo. Same
                    @ glyph as the old MY PD toggle (Arial via #sb-redacted CSS). */}
                <SettingsToggle
                    id="sb-redacted"
                    active={notifs.redactedMode}
                    onClick={() => {
                        const next = !notifs.redactedMode;
                        toggle('redactedMode');
                        showToast(`Redacted Mode: ${next ? 'ON' : 'OFF'}`);
                    }}
                    icon={'@︎'}
                    label="Redacted"
                />
                {/* The Watch — hardcoded pill (like Stargazing / Echo) taking
                    the retired Solar Flare slot (Brendon 2026-06-14). Toggles
                    the plain `watch` flag; the floating live-stat chip mounts
                    globally in PriceOSShell and reads it. */}
                <SettingsToggle
                    id="sb-watch"
                    active={notifs.watch}
                    onClick={() => {
                        const next = !notifs.watch;
                        toggle('watch');
                        showToast(`The Watch: ${next ? 'ON' : 'OFF'}`);
                    }}
                    icon={'⬬︎'}
                    label="The Watch"
                />
                {/* Degen — moved here from MY PD (Brendon, 2026-06-16), right
                    after The Watch. Plain `degen` flag (not spell_*), so it's a
                    hardcoded pill like Stargazing / Echo. Preserves the sim
                    9357-9358 side-effect: activating Degen auto-sorts the gallery
                    by price. */}
                <SettingsToggle
                    id="sb-degen"
                    active={notifs.degen}
                    onClick={() => {
                        const next = !notifs.degen;
                        toggle('degen');
                        showToast(`Degen: ${next ? 'ON' : 'OFF'}`);
                        if (next) setSort('price');
                    }}
                    icon={'⚔︎'}
                    label="Degen"
                />
                {/* Stargazing — sim 4735. Occupies the slot between Solar Flare
                    and Offer Shield. It toggles the plain `stargazing` pdNotifs
                    key (no spell_ prefix), so it cannot go through the SPELLS
                    array (typed as spell_* flags). Sim uses toggleMode(), not
                    toggleSpell(); we wire the same toast path. */}
                <SettingsToggle
                    id="sb-stargazing"
                    active={notifs.stargazing}
                    onClick={() => {
                        const next = !notifs.stargazing;
                        toggle('stargazing');
                        showToast(`Stargazing Mode: ${next ? 'ON' : 'OFF'}`);
                    }}
                    icon={'⍟\uFE0E'}
                    label="Stargazing"
                />
                {/* Echo Chamber — plain `echo` flag (not spell_*), so it lives
                    here as a hardcoded pill like Stargazing. Moved out of MY PD
                    (Brendon 2026-06-14) — that slot is now the Ambient Strip. */}
                <SettingsToggle
                    id="sb-echo"
                    active={notifs.echo}
                    onClick={() => {
                        const next = !notifs.echo;
                        toggle('echo');
                        showToast(`Echo Chamber: ${next ? 'ON' : 'OFF'}`);
                    }}
                    icon={'≫︎'}
                    label="Echo Chamber"
                />
                {/* Spells 12–17: offer shield → hammer */}
                {SPELLS.slice(11).map((spell) => (
                    <SettingsToggle
                        key={spell.id}
                        id={`sb-${spell.id}`}
                        active={notifs[spell.flag]}
                        onClick={() => toggleSpellWithToast(spell)}
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
                        /* Build 32 D21 — Hammer alone wears the badge slot.
                           Sim 4759 places `<span class="hammer-badge"
                           id="hammerBadge">N</span>` after the label inside
                           the pill. We omit the DOM id (no imperative
                           consumer in the React port — state drives it) and
                           render only when count > 0 so the empty hidden
                           state matches sim's `display:none`. */
                        badge={
                            spell.id === 'hammer' && hammerCount > 0
                                ? <span className="hammer-badge" id="hammerBadge">{hammerCount}</span>
                                : undefined
                        }
                    />
                ))}
            </div>
        </>
    );
}
