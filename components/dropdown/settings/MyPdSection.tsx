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
import { useSort } from '../../../lib/state/SortContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useWorkspaces } from '../../../lib/state/WorkspacesContext';
import { useArtistColor } from '../../../lib/hooks/useArtistColor';
import { useAuth } from '../../../lib/state/AuthContext';
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
    const { theme, setTheme } = useTheme();
    const { setSort } = useSort();
    const { showToast } = useToast();
    const { currentCode, applyCode } = useWorkspaces();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;

    /* F64 (BUG-28) — artist-color picker is now live + persistent.
       useArtistColor owns the storage + migration; this section owns the
       UI surface (hidden <input type="color"> wired to the pill, visible
       hex text input with validate-on-blur, copy button). When the active
       theme is 'artist', ThemeContext re-applies on each color change so
       the page actually responds. */
    const { color: artistColor, setColor: setArtistColor } = useArtistColor();
    const [hexField, setHexField] = useState<string>(artistColor);
    const copyingHexRef = useRef(false);
    const editingHexRef = useRef(false);
    const colorPickerRef = useRef<HTMLInputElement | null>(null);

    /* Profile Page v0 — Showcase mode toggle. Sits to the right of the
       copy-hex button. ⑆ = static (default, user-ordered, doesn't
       change), ⑇ = generative (randomized order each visit). Visual
       toggle only for v0 — Showcase grid wiring lands when persistence
       + slot model arrive. Persisted to localStorage `pd_showcase_mode`
       so the picked mode survives reload. SSR-safe via the typeof
       window guard pattern useArtistColor uses. */
    const SHOWCASE_KEY = 'pd_showcase_mode';
    const [showcaseMode, setShowcaseModeState] = useState<'static' | 'generative'>('static');
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(SHOWCASE_KEY);
            if (raw === 'generative' || raw === 'static') {
                setShowcaseModeState(raw);
            }
        } catch {
            /* ignore */
        }
    }, []);
    const toggleShowcaseMode = () => {
        setShowcaseModeState((prev) => {
            const next = prev === 'static' ? 'generative' : 'static';
            try {
                localStorage.setItem(SHOWCASE_KEY, next);
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    // Keep the hex field synced to the live color whenever the user
    // isn't mid-edit and the copy-blink isn't holding the slot.
    useEffect(() => {
        if (editingHexRef.current) return;
        if (copyingHexRef.current) return;
        setHexField(artistColor);
    }, [artistColor]);

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

    /* Brendon list item 7 — Pure Light / Pure Dark mode parity.
       Sim 9308-9320 togglePure(mode):
         1. Flip pdNotifs.pure_light / pdNotifs.pure_dark.
         2. Persist to localStorage (the toggle() helper handles this).
         3. Dispatch pd:pure-mode-changed so ThemeContext re-applies
            on the active theme key (picks up the bg-hex override).
         4. If now ON: setAndSaveTheme(mode) — switch theme to light/dark
            AND persist (so the user's saved theme becomes light/dark).
         5. If now OFF: setTheme(savedKey) — restore whatever theme is
            in localStorage (which may itself be 'light' or 'dark', but
            with the pure flag now false, applyTheme returns the standard
            #e0e0e0 / #1a1a1a bg).
         6. Toast 'Pure Light/Dark ON/OFF'. */
    const togglePure = (mode: 'light' | 'dark') => {
        const stateKey = (mode === 'light' ? 'pure_light' : 'pure_dark') as keyof PdNotifs;
        const next = !notifs[stateKey];

        // CRITICAL ORDERING: applyTheme reads pure_light/pure_dark from
        // localStorage (ThemeContext lives upstream of PdNotifsContext, so
        // it can't useNotifs() — it reads LS directly). React state +
        // PdNotifs → LS sync goes through a useEffect that fires AFTER
        // the next commit, but setTheme(mode) below synchronously calls
        // applyTheme which reads LS. So we MUST write the new flag to LS
        // here, BEFORE setTheme, or applyTheme reads the stale value and
        // the bg-hex override misses by one click. The PdNotifs effect
        // will later re-write LS with the same value once the React state
        // commit catches up — safe no-op.
        try {
            const raw = localStorage.getItem('pd_settings_notifs');
            const parsed: Record<string, unknown> = raw ? JSON.parse(raw) : {};
            parsed[stateKey] = next;
            localStorage.setItem('pd_settings_notifs', JSON.stringify(parsed));
        } catch {
            /* private mode / quota — applyTheme will read whatever LS has,
               worst case the override misses one click. */
        }

        toggle(stateKey);

        if (next) {
            // Sim 9314 — setAndSaveTheme(mode). setTheme via context
            // already writes the theme to localStorage in its callback.
            setTheme(mode);
        } else {
            // Sim 9316 — setTheme(localStorage.getItem('pd_settings_theme') || 'artist').
            try {
                const saved = localStorage.getItem('pd_settings_theme');
                const valid = saved && (saved === 'artist' || saved === 'light' || saved === 'dark' || saved === 'orange' || saved === 'blue' || saved === 'red')
                    ? (saved as 'artist' | 'light' | 'dark' | 'orange' | 'blue' | 'red')
                    : 'artist';
                setTheme(valid);
            } catch {
                setTheme('artist');
            }
        }

        // Belt-and-suspenders re-apply for the case where setTheme above
        // was a no-op (e.g. pure_dark flipping while theme is already
        // 'dark' — setTheme('dark') sees no theme change but applyTheme
        // still needs to fire to pick up the new pure flag).
        try {
            window.dispatchEvent(new CustomEvent('pd:pure-mode-changed'));
        } catch {
            /* SSR-safe ignore */
        }

        showToast(`${mode === 'light' ? 'Pure Light' : 'Pure Dark'} ${next ? 'ON' : 'OFF'}`);
    };

    return (
        <>
            <div id="myPdHeaderWrap">
                {/* Brendon S5 May 11 — MY PD header + setup code stay live
                   when !isAuthed. Setup code is a local-preference apply
                   surface, doesn't require auth. The MY PD header is also
                   the triple-tap entry into the Spell Book; gating it dead
                   on logged-out kills Spell Book access entirely. */}
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
                {/* F64 (BUG-28) — live profile color picker. Hidden <input
                    type="color"> sits absolutely positioned inside a
                    relatively-positioned wrapper, opened by tapping the
                    pill (sim 4610-4613 — sim wraps in a <label>; we use a
                    ref + .click() since SettingsToggle is a button). The
                    visible hex input mirrors the hook's color, validates
                    on every change, persists on valid match, and reverts
                    on blur if the typed value is malformed. Copy button
                    writes the current color to the clipboard and swaps
                    the field to "COPIED" for 1500ms. */}
                <div className="settings-pill-row">
                    <div style={{ position: 'relative' }}>
                        <SettingsToggle
                            id="sn-profileTheme"
                            active={theme === 'artist'}
                            title="Profile Theme"
                            icon={'◩\uFE0E'}
                            label="PROFILE THEME"
                            onClick={() => colorPickerRef.current?.click()}
                        />
                        <input
                            ref={colorPickerRef}
                            type="color"
                            id="profileColorPicker"
                            value={artistColor}
                            onChange={(e) => setArtistColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            tabIndex={-1}
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                opacity: 0,
                                width: '1px',
                                height: '1px',
                                bottom: 0,
                                left: '50%',
                                pointerEvents: 'none',
                            }}
                        />
                    </div>
                    <input
                        type="text"
                        id="profileHexInput"
                        value={hexField}
                        className="hex-input"
                        maxLength={7}
                        spellCheck={false}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={() => {
                            editingHexRef.current = true;
                        }}
                        onChange={(e) => {
                            const v = e.target.value;
                            setHexField(v);
                            // Live-apply whenever the typed value is a
                            // complete 6-digit hex; intermediate states
                            // (e.g. "#FF") just update the visible field.
                            if (/^#[0-9A-F]{6}$/i.test(v)) {
                                setArtistColor(v);
                            }
                        }}
                        onBlur={() => {
                            editingHexRef.current = false;
                            if (!/^#[0-9A-F]{6}$/i.test(hexField)) {
                                // Invalid hex on blur — revert to the
                                // last known good color.
                                setHexField(artistColor);
                            } else {
                                // Normalize casing for valid input.
                                setHexField(hexField.toUpperCase());
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                                setHexField(artistColor);
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                    />
                    <span
                        className="copy-hex-btn"
                        title="Copy Hex"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            try {
                                navigator.clipboard?.writeText(artistColor);
                            } catch {
                                // ignore
                            }
                            copyingHexRef.current = true;
                            setHexField('COPIED');
                            window.setTimeout(() => {
                                copyingHexRef.current = false;
                                setHexField(artistColor);
                            }, 1500);
                        }}
                    >
                        ⧉{'\uFE0E'}
                    </span>
                    {/* Profile Page v0 — Showcase mode toggle. Lives
                        right of the copy-hex button per spec. Glyph
                        flips on tap: ⑆ static (default) ↔ ⑇ generative.
                        Visual + persistence only for v0; the Showcase
                        grid that reads this flag lands when the slot
                        model + Add-to-Showcase action arrive. */}
                    <span
                        className="copy-hex-btn"
                        title={
                            showcaseMode === 'static'
                                ? 'Showcase Mode — Static'
                                : 'Showcase Mode — Generative'
                        }
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleShowcaseMode();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleShowcaseMode();
                            }
                        }}
                    >
                        {showcaseMode === 'static' ? '⑆' : '⑇'}
                        {'\uFE0E'}
                    </span>
                </div>

                {/* Row 1: Pure Light / Pure Dark / Price Logo / Anon /
                    Zen / Sticker / Echo Chamber */}
                <div className="settings-pill-row" style={{ paddingTop: 0 }}>
                    <SettingsToggle
                        id="sn-pureLight"
                        title="Pure Light Mode"
                        active={notifs.pure_light}
                        onClick={() => togglePure('light')}
                        icon={'◻\uFE0E'}
                        label="PL"
                    />
                    <SettingsToggle
                        id="sn-pureDark"
                        title="Pure Dark Mode"
                        active={notifs.pure_dark}
                        onClick={() => togglePure('dark')}
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
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 2px' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-zen"
                        title="Zen Mode"
                        active={notifs.zenMode}
                        onClick={() => toggleWithToast('zenMode', 'Zen Mode')}
                        icon={'⛶\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 2px' }}
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sticker"
                        title="Sticker Mode"
                        active={notifs.sticker}
                        onClick={() => toggleWithToast('sticker', 'Sticker Mode')}
                        icon={'▣\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1', margin: '0 2px' }}
                        iconClassName="sticker-strike"
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto', position: 'relative', overflow: 'visible' }}
                    />
                    <SettingsToggle
                        id="sn-echo"
                        title="Echo Chamber"
                        active={notifs.echo}
                        onClick={() => toggleWithToast('echo', 'Echo Chamber')}
                        icon={'⊛\uFE0E'}
                        iconStyle={{ fontSize: '16px', lineHeight: '1', margin: '0 1px' }}
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
                        iconStyle={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-pricelens"
                        title="Price Lens — floor-relative pricing"
                        active={notifs.spell_pricelens}
                        onClick={() => toggleWithToast('spell_pricelens', 'Price Lens')}
                        icon={'⌾\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sentiment"
                        title="Sentiment Weather"
                        active={notifs.sentimentOn}
                        onClick={() => toggleWithToast('sentimentOn', 'Sentiment Weather')}
                        icon={'◒\uFE0E'}
                        iconStyle={{ fontSize: '14px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-asciiId"
                        title="ASCII-ID"
                        active={notifs.asciiId}
                        onClick={() => toggleWithToast('asciiId', 'ASCII-ID')}
                        icon={'⍢\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-degen"
                        title="Degen Mode"
                        active={notifs.degen}
                        onClick={() => {
                            /* Brendon list item 8 — Degen Mode toggle.
                               Sim 9357-9358: when degen activates, auto-
                               sort the gallery by price ascending. The
                               body-class flip + canvas hide + overlay
                               render ride on PdNotifsContext via
                               useBodyClass; this onClick adds the sort
                               side effect that sim does inline. The flag
                               flip + toast still go through the standard
                               toggleWithToast path so Setup Code +
                               localStorage stay in sync. */
                            const next = !notifs.degen;
                            toggleWithToast('degen', 'Degen Mode');
                            if (next) setSort('price');
                        }}
                        icon={'⚔\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-redacted"
                        title="Redacted Mode"
                        active={notifs.redactedMode}
                        onClick={() => toggleWithToast('redactedMode', 'Redacted Mode')}
                        icon={'@\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 1px' }}
                        iconClassName="redacted-strike"
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto', position: 'relative', overflow: 'visible' }}
                    />
                    <SettingsToggle
                        id="sn-tape"
                        title="The Tape — tap to cycle"
                        active={notifs.tape !== 0}
                        onClick={() => {
                            /* Brendon list item 9 — sim 9287-9306. Desktop
                               cycles all 5 states (0→1→2→3→4→0); mobile
                               skips Faded (1) + Standard (2) which sim
                               annotates as "illegible at mobile sizes"
                               (sim 9286). Width threshold matches sim
                               9292's `(max-width: 600px)` matchMedia. */
                            const isMobile =
                                typeof window !== 'undefined' &&
                                window.matchMedia('(max-width: 600px)').matches;
                            const cycle: number[] = isMobile ? [0, 3, 4] : [0, 1, 2, 3, 4];
                            const idx = cycle.indexOf(notifs.tape);
                            const next: number =
                                (idx === -1
                                    ? cycle[0]
                                    : cycle[(idx + 1) % cycle.length]) ?? 0;
                            update({ tape: next as 0 | 1 | 2 | 3 | 4 });
                            const labels: Record<number, string> = {
                                0: 'OFF',
                                1: 'Faded (Desktop only)',
                                2: 'Standard (Desktop only)',
                                3: 'Bold',
                                4: 'Framed',
                            };
                            showToast('The Tape: ' + (labels[next] ?? 'OFF'));
                        }}
                        icon={'⏥\uFE0E'}
                        iconStyle={{ fontSize: '15px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-autoscroll"
                        title="Auto-Scroll"
                        active={notifs.autoscroll}
                        onClick={() => toggleWithToast('autoscroll', 'Auto-Scroll')}
                        icon={'⍖\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                </div>
            </div>
        </>
    );
}
