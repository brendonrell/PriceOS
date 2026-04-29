'use client';

/*
 * MyPdSection
 *
 * Settings panel section 2 — MY PD.
 *
 * Top row: header label + setup-code input + copy icon. Triple-tapping
 * the "MY PD" header label flips a parent-managed flag to show Spell
 * Book content instead of MY PD content (handled in SettingsView.tsx).
 *
 * Two pill rows of mode toggles. Most just flip a pdNotifs flag with
 * no further effect in step 4 — the rendering side of each spell
 * (e.g. Stargazing's starfield, Anon's redacted handle bars) lives in
 * components downstream from this state and lights up automatically as
 * each downstream component is built out in later steps.
 *
 * Setup code is read-only display in step 4 — apply / encode-decode
 * lands once the spell behaviors do, since the code is a serialization
 * of the same flags.
 */

import { useRef } from 'react';
import { usePdNotifs } from '../../../lib/state/PdNotifsContext';
import { useTheme } from '../../../lib/state/ThemeContext';
import { SettingsToggle } from './SettingsToggle';

interface Props {
    /**
     * Triple-tap handler on the "MY PD" header — flips parent state to
     * show the Spell Book content. Handled by SettingsView, not here.
     */
    onTripleTap: () => void;
}

export function MyPdSection({ onTripleTap }: Props) {
    const { notifs, toggle, update } = usePdNotifs();
    const { theme } = useTheme();

    // Triple-tap detector: 3 taps within 600ms. Any tap that doesn't
    // come within 600ms of the previous resets the count.
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
            <div id="myPdHeaderWrap">
                <div className="setup-code-row">
                    <div
                        className="settings-header"
                        id="myPdHeader"
                        style={{ cursor: 'default', userSelect: 'none' }}
                        onClick={handleHeaderTap}
                        title="Triple-tap to open the Spell Book"
                    >
                        MY PD
                    </div>
                    <input
                        type="text"
                        id="setupCodeInput"
                        className="setup-code-input"
                        defaultValue="‰ARTS-IDAS"
                        spellCheck={false}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        title="Setup Code — encodes your current PD configuration."
                        readOnly
                    />
                    <span
                        className="setup-code-copy"
                        onClick={(e) => {
                            e.stopPropagation();
                            try {
                                navigator.clipboard?.writeText('‰ARTS-IDAS');
                            } catch {
                                // ignore
                            }
                        }}
                        title="Copy Setup Code"
                        role="button"
                        tabIndex={0}
                    >
                        ⧉{'\uFE0E'}
                    </span>
                </div>
            </div>

            <div id="myPdContent">
                {/* Profile theme picker (color input). Compact label-pill with
                    a hidden color input + a visible hex text field next to
                    it. Step 4 wires color picker → hex input only; persisting
                    a custom artist color is step 5. */}
                <div className="settings-pill-row">
                    <SettingsToggle
                        id="sn-profileTheme"
                        active={theme === 'artist'}
                        title="Profile Theme"
                        icon={'◩\uFE0E'}
                        label="PROFILE THEME"
                    />
                    <input
                        type="text"
                        id="profileHexInput"
                        defaultValue="#FFE600"
                        className="hex-input"
                        maxLength={7}
                        spellCheck={false}
                        readOnly
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span
                        className="copy-hex-btn"
                        title="Copy Hex"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            try {
                                navigator.clipboard?.writeText('#FFE600');
                            } catch {
                                // ignore
                            }
                        }}
                    >
                        ⧉{'\uFE0E'}
                    </span>
                </div>

                {/* Row 1: Pure Light / Pure Dark / Price Logo / Anon /
                    Zen / Sticker / Echo Chamber */}
                <div className="settings-pill-row" style={{ paddingTop: 0 }}>
                    <SettingsToggle
                        id="sn-pureLight"
                        title="Pure Light Mode"
                        icon={'◻\uFE0E'}
                        label="PL"
                        // No corresponding pdNotifs flag in step 4 — the
                        // pure-mode interactions are tied to active theme
                        // and land in step 5.
                    />
                    <SettingsToggle
                        id="sn-pureDark"
                        title="Pure Dark Mode"
                        icon={'◼\uFE0E'}
                        label="PD"
                    />
                    <SettingsToggle
                        id="sn-priceLogo"
                        title="Price Logo"
                        active={notifs.priceLogo}
                        onClick={() => toggle('priceLogo')}
                        icon={'‰\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                        className="price-strike"
                    />
                    <SettingsToggle
                        id="sn-anon"
                        title="Anon Mode"
                        icon={'∅\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-zen"
                        title="Zen Mode"
                        active={notifs.zenMode}
                        onClick={() => toggle('zenMode')}
                        icon={'⛶\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sticker"
                        title="Sticker Mode"
                        icon={'▣\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto', position: 'relative', overflow: 'visible' }}
                    />
                    <SettingsToggle
                        id="sn-echo"
                        title="Echo Chamber"
                        icon={'⊛\uFE0E'}
                        iconStyle={{ fontSize: '16px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                </div>

                {/* Row 2: Zerocontext / Pricelens / Sentiment / AsciiId /
                    Degen / Redacted / Tape / Autoscroll */}
                <div className="settings-pill-row" style={{ paddingTop: 0 }}>
                    <SettingsToggle
                        id="sn-zerocontext"
                        title="Zero Context Mode"
                        icon={'z\uFE0E'}
                        iconStyle={{ fontSize: '14px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-pricelens"
                        title="Price Lens — floor-relative pricing"
                        active={notifs.spell_pricelens}
                        onClick={() => toggle('spell_pricelens')}
                        icon={'⌾\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sentiment"
                        title="Sentiment Weather"
                        active={notifs.sentimentOn}
                        onClick={() => toggle('sentimentOn')}
                        icon={'◒\uFE0E'}
                        iconStyle={{ fontSize: '14px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-asciiId"
                        title="ASCII-ID"
                        icon={'⍢\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-degen"
                        title="Degen Mode"
                        icon={'⚔\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-redacted"
                        title="Redacted Mode"
                        active={notifs.redactedMode}
                        onClick={() => toggle('redactedMode')}
                        icon={'@\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto', position: 'relative', overflow: 'visible' }}
                        className="redacted-strike"
                    />
                    <SettingsToggle
                        id="sn-tape"
                        title="The Tape — tap to cycle"
                        active={notifs.tape !== 0}
                        onClick={() => {
                            // Cycle 0 → 3 → 4 → 0 (matches sim's mobile cycle, skips
                            // desktop-only Faded and Standard until those land).
                            const cycle: Array<0 | 3 | 4> = [0, 3, 4];
                            const idx = cycle.indexOf(notifs.tape as 0 | 3 | 4);
                            const next = cycle[(idx + 1) % cycle.length] ?? 0;
                            update({ tape: next });
                        }}
                        icon={'⏥\uFE0E'}
                        iconStyle={{ fontSize: '15px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-autoscroll"
                        title="Auto-Scroll"
                        icon={'⍖\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                </div>
            </div>
        </>
    );
}
