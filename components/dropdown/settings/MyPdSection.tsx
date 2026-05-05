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

import { useEffect, useRef, useState } from 'react';
import { usePdNotifs, type PdNotifs } from '../../../lib/state/PdNotifsContext';
import { useTheme } from '../../../lib/state/ThemeContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useWorkspaces } from '../../../lib/state/WorkspacesContext';
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
    const { showToast } = useToast();
    const { currentCode, applyCode } = useWorkspaces();

    // Build 26 D12 — setup-code field is now live + interactive.
    // The displayed value tracks `currentCode` (encoded from theme + sort
    // + notifs) unless the user is mid-edit. Enter or blur applies the
    // typed code via WorkspacesContext.applyCode. Copy briefly swaps the
    // value to "COPIED" for 1500ms (sim 7635 — matches copyProfileHex's
    // pattern: input.value swap, not a separate toast).
    const [inputValue, setInputValue] = useState(currentCode);
    const [editing, setEditing] = useState(false);
    const copyingRef = useRef(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Sync field from live currentCode when not editing + not mid-copy.
    useEffect(() => {
        if (editing) return;
        if (copyingRef.current) return;
        setInputValue(currentCode);
    }, [currentCode, editing]);

    const handleApply = () => {
        const trimmed = inputValue.trim();
        // Build 27 fix-ship F3 — empty/whitespace-only input on blur was
        // early-returning without resetting `editing`, leaving the field
        // stuck on its empty state and the live-sync useEffect
        // permanently gated. Restore live + drop editing flag instead.
        if (!trimmed) {
            setInputValue(currentCode);
            setEditing(false);
            return;
        }
        // No-op if the field still matches live state (no real edit).
        if (trimmed === currentCode) {
            setEditing(false);
            return;
        }
        const ok = applyCode(trimmed);
        setEditing(false);
        if (!ok) {
            // Restore the live value so the field doesn't get stuck on
            // an invalid string the user typed.
            setInputValue(currentCode);
        } else {
            // Trigger the 600ms flash animation by toggling the class.
            const el = inputRef.current;
            if (el) {
                el.classList.remove('flash-applied');
                // Force reflow so the animation re-fires when the same
                // class is re-added in quick succession.
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                void el.offsetWidth;
                el.classList.add('flash-applied');
                window.setTimeout(() => {
                    el.classList.remove('flash-applied');
                }, 700);
            }
        }
    };

    const handleCopy = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        try {
            navigator.clipboard?.writeText(currentCode);
        } catch {
            // ignore
        }
        copyingRef.current = true;
        setInputValue('COPIED');
        window.setTimeout(() => {
            copyingRef.current = false;
            setInputValue(currentCode);
        }, 1500);
    };

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

    /* Build 29 D28 — every mode toggle now emits a `<Label> ON|OFF`
       toast on flip. Pattern matches sim 9319 / 9320 / 9599 / 12700:
       compute the next state at click time (notifs reflects the
       pre-toggle value) and toast it. The body-class follow-through
       still rides on PdNotifsContext via useBodyClass.  */
    const toggleWithToast = (key: keyof PdNotifs, label: string) => {
        const next = !notifs[key];
        toggle(key);
        showToast(`${label} ${next ? 'ON' : 'OFF'}`);
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
                        ref={inputRef}
                        type="text"
                        id="setupCodeInput"
                        className="setup-code-input"
                        value={inputValue}
                        onChange={(e) => {
                            setEditing(true);
                            setInputValue(e.target.value);
                        }}
                        onFocus={() => {
                            setEditing(true);
                            // Build 27 fix-ship F2 — sim 10051-10057: select
                            // the whole field on focus so paste-replace is
                            // the expected default. setTimeout(0) wins the
                            // race against the iOS soft keyboard, which
                            // otherwise collapses the selection on its
                            // own focus pass.
                            const el = inputRef.current;
                            if (el) {
                                window.setTimeout(() => {
                                    try { el.select(); } catch { /* ignore */ }
                                }, 0);
                            }
                        }}
                        onBlur={() => {
                            handleApply();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                inputRef.current?.blur();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setInputValue(currentCode);
                                setEditing(false);
                                inputRef.current?.blur();
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        spellCheck={false}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        title="Setup Code — encodes your current PD configuration. Paste a code + Enter to apply."
                    />
                    <span
                        className="setup-code-copy"
                        onClick={handleCopy}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCopy(e);
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
                        active={notifs.pure_light}
                        onClick={() => toggleWithToast('pure_light', 'Pure Light')}
                        icon={'◻\uFE0E'}
                        label="PL"
                    />
                    <SettingsToggle
                        id="sn-pureDark"
                        title="Pure Dark Mode"
                        active={notifs.pure_dark}
                        onClick={() => toggleWithToast('pure_dark', 'Pure Dark')}
                        icon={'◼\uFE0E'}
                        label="PD"
                    />
                    <SettingsToggle
                        id="sn-priceLogo"
                        title="Price Logo"
                        active={notifs.priceLogo}
                        onClick={() => toggleWithToast('priceLogo', 'Price Logo')}
                        icon={'‰\uFE0E'}
                        iconStyle={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '12px',
                            fontWeight: 'bold',
                            lineHeight: '1',
                            letterSpacing: 0,
                            margin: '0 2px',
                        }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                        className="price-strike"
                    />
                    <SettingsToggle
                        id="sn-anon"
                        title="Anon Mode"
                        active={notifs.anon}
                        onClick={() => toggleWithToast('anon', 'Anon Mode')}
                        icon={'∅\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-zen"
                        title="Zen Mode"
                        active={notifs.zenMode}
                        onClick={() => toggleWithToast('zenMode', 'Zen Mode')}
                        icon={'⛶\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sticker"
                        title="Sticker Mode"
                        active={notifs.sticker}
                        onClick={() => toggleWithToast('sticker', 'Sticker Mode')}
                        icon={'▣\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto', position: 'relative', overflow: 'visible' }}
                    />
                    <SettingsToggle
                        id="sn-echo"
                        title="Echo Chamber"
                        active={notifs.echo}
                        onClick={() => toggleWithToast('echo', 'Echo Chamber')}
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
                        active={notifs.zerocontext}
                        onClick={() => toggleWithToast('zerocontext', 'Zero Context Mode')}
                        icon={'z\uFE0E'}
                        iconStyle={{ fontSize: '14px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-pricelens"
                        title="Price Lens — floor-relative pricing"
                        active={notifs.spell_pricelens}
                        onClick={() => toggleWithToast('spell_pricelens', 'Price Lens')}
                        icon={'⌾\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sentiment"
                        title="Sentiment Weather"
                        active={notifs.sentimentOn}
                        onClick={() => toggleWithToast('sentimentOn', 'Sentiment Weather')}
                        icon={'◒\uFE0E'}
                        iconStyle={{ fontSize: '14px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-asciiId"
                        title="ASCII-ID"
                        active={notifs.asciiId}
                        onClick={() => toggleWithToast('asciiId', 'ASCII-ID')}
                        icon={'⍢\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-degen"
                        title="Degen Mode"
                        active={notifs.degen}
                        onClick={() => toggleWithToast('degen', 'Degen Mode')}
                        icon={'⚔\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-redacted"
                        title="Redacted Mode"
                        active={notifs.redactedMode}
                        onClick={() => toggleWithToast('redactedMode', 'Redacted Mode')}
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
                            // Build 25 D11: showToast feedback per sim 9305 — without
                            // this the button looked dead because no surface yet
                            // listens to notifs.tape.
                            const cycle: Array<0 | 3 | 4> = [0, 3, 4];
                            const idx = cycle.indexOf(notifs.tape as 0 | 3 | 4);
                            const next = cycle[(idx + 1) % cycle.length] ?? 0;
                            update({ tape: next });
                            const labels: Record<0 | 3 | 4, string> = {
                                0: 'OFF',
                                3: 'Bold',
                                4: 'Framed',
                            };
                            showToast('The Tape: ' + labels[next]);
                        }}
                        icon={'⏥\uFE0E'}
                        iconStyle={{ fontSize: '15px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-autoscroll"
                        title="Auto-Scroll"
                        active={notifs.autoscroll}
                        onClick={() => toggleWithToast('autoscroll', 'Auto-Scroll')}
                        icon={'⍖\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                </div>
            </div>
        </>
    );
}
