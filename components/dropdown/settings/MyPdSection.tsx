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
import { useRouter } from 'next/navigation';
import { useDropdown } from '../../../lib/state/DropdownContext';
import { usePdNotifs, type PdNotifs } from '../../../lib/state/PdNotifsContext';
import { useColorway } from '../../../lib/state/ColorwayContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useWorkspaces } from '../../../lib/state/WorkspacesContext';
import { useSort, encodeSortSlug } from '../../../lib/state/SortContext';
import { composeViewLink } from '../../../lib/state/viewLink';
import { useProfileHex } from '../../../lib/hooks/useProfileHex';
import { useAuth } from '../../../lib/state/AuthContext';
import { pushState, USERSTATE_HYDRATED_EVENT } from '../../../lib/state/userState';
import { effectiveShowcaseStyle } from '../../../lib/profile/showcaseStyle';
import type { ShowcaseStyle } from '../../../lib/supabase';
import { SettingsToggle } from './SettingsToggle';
import { PerMilleMark } from '../../shell/PerMilleMark';

interface Props {
    /**
     * Triple-tap handler on the "MY PD" header — flips parent state to
     * show the Spell Book content. Handled by SettingsView, not here.
     */
    onTripleTap: () => void;
}

export function MyPdSection({ onTripleTap }: Props) {
    const { notifs, toggle, update } = usePdNotifs();
    const { colorway, setColorway } = useColorway();
    const { showToast } = useToast();
    const { currentCode, applyCode } = useWorkspaces();
    const { sort, dir, feedKind, group } = useSort();
    const { siweAddress, handle } = useAuth();
    const isAuthed = !!siweAddress;
    const router = useRouter();
    const { closeMenu } = useDropdown();

    /* PROFILE TAGS door (Brendon, 2026-08-15) — a more obvious entry point
       beside the User Showcase glyph. Does the exact same thing as
       long-pressing your own @name on the profile page (opens the tag/
       colourway customization row); Settings lives outside that page, so
       it navigates home + dispatches 'pd:open-tag-egg' for the page to
       pick up on mount. */
    const openProfileTagsDoor = () => {
        if (!handle) return;
        closeMenu();
        try { sessionStorage.setItem('pd_open_tag_egg', '1'); } catch { /* ignore */ }
        if (typeof window !== 'undefined' && window.location.pathname === `/${handle}`) {
            window.dispatchEvent(new CustomEvent('pd:open-tag-egg'));
        } else {
            router.push(`/${handle}`);
        }
    };

    /* PROFILE COLORWAY picker — the colour a user picks for their OWN
       profile page. useProfileHex owns its storage + migration (slot
       `pd_profile_hex`, server column `profile_hex`); this section owns the
       UI surface (hidden <input type="color"> wired to the pill, visible
       hex text input with validate-on-blur, copy button).
       DECOUPLE GUARD: this is NOT the "Custom" colorway and NOT "Haze Mode".
       It writes only profile_hex — never `pd_custom_color` / `pd_haze_color`. */
    const { hex: profileHex, setHex: setProfileHex } = useProfileHex();
    const [hexField, setHexField] = useState<string>(profileHex);
    const copyingHexRef = useRef(false);
    const editingHexRef = useRef(false);
    const colorPickerRef = useRef<HTMLInputElement | null>(null);

    /* User Showcase mode toggle. Sits to the right of the copy-hex button.
       ⑆ = static (user-ordered), ⑇ = generative (reshuffles each visit), and
       — for WHITELISTED ARTISTS only — ⑈ = artist (their Now-Minting view),
       which is their default once whitelisted (Brendon 2026-06-15). Persisted
       to `pd_user_showcase_mode`; the raw value may be the legacy 'grid' unset
       marker, resolved to the effective mode for display. SSR-safe. */
    const USER_SHOWCASE_KEY = 'pd_user_showcase_mode';
    const [rawShowcase, setRawShowcase] = useState<string>('grid');
    const [isArtist, setIsArtist] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(USER_SHOWCASE_KEY);
            if (raw) setRawShowcase(raw);
        } catch { /* ignore */ }
    }, []);
    // Re-read showcase_style when a server snapshot hydrates (login anywhere).
    useEffect(() => {
        const handler = () => {
            try {
                const raw = localStorage.getItem(USER_SHOWCASE_KEY);
                if (raw) setRawShowcase(raw);
            } catch { /* ignore */ }
        };
        window.addEventListener(USERSTATE_HYDRATED_EVENT, handler);
        return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, handler);
    }, []);
    // The Artist option only exists for whitelisted artists who've ALSO released
    // at least one project (Brendon 2026-06-20) — both come from /api/me/artist.
    useEffect(() => {
        if (!siweAddress) { setIsArtist(false); return; }
        let cancelled = false;
        fetch('/api/me/artist', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setIsArtist(!!d.is_artist && !!d.has_project); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress]);

    // Collected count — gates the Gen Curated showcase (it needs a deep
    // collection to curate from; unlocks at 100, Brendon 2026-07-16). Light
    // head-count read, no holdings payload.
    const [ownedCount, setOwnedCount] = useState(0);
    useEffect(() => {
        if (!siweAddress) { setOwnedCount(0); return; }
        let cancelled = false;
        fetch(`/api/user/${siweAddress}/count`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d && typeof d.total === 'number') setOwnedCount(d.total); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress]);

    const showcaseMode = effectiveShowcaseStyle(rawShowcase, isArtist, siweAddress ?? undefined);
    const cycleUserShowcaseMode = () => {
        // Order: Artist › Static › Generative › Gen Curated (Brendon 2026-06-20);
        // Artist only present for project-having whitelisted artists.
        const order: ShowcaseStyle[] = isArtist
            ? ['artist', 'static', 'generative', 'gen-curated']
            : ['static', 'generative', 'gen-curated'];
        const idx = order.indexOf(showcaseMode);
        const next: ShowcaseStyle = order[(idx + 1) % order.length] ?? 'static';
        // Gen Curated needs a deep collection to curate from — gated at 100 pieces
        // (Brendon 2026-07-16). Below the floor, the tap surfaces the unlock and
        // steps over Gen Curated to the next style rather than landing on it.
        if (next === 'gen-curated' && ownedCount < 100) {
            const stepped: ShowcaseStyle = order[(idx + 2) % order.length] ?? 'static';
            try { localStorage.setItem(USER_SHOWCASE_KEY, stepped); } catch { /* ignore */ }
            setRawShowcase(stepped);
            pushState({ showcase_style: stepped });
            window.dispatchEvent(new CustomEvent('pd:showcase-style-changed', { detail: stepped }));
            showToast(`Gen Curated: ${ownedCount}/100 TO UNLOCK`);
            return;
        }
        try { localStorage.setItem(USER_SHOWCASE_KEY, next); } catch { /* ignore */ }
        setRawShowcase(next);
        pushState({ showcase_style: next });
        // Tell the profile so its showcase re-sorts live (no reload needed).
        window.dispatchEvent(new CustomEvent('pd:showcase-style-changed', { detail: next }));
        const label = next === 'generative' ? 'GENERATIVE'
            : next === 'gen-curated' ? 'GEN CURATED'
            : next === 'artist' ? 'ARTIST' : 'STATIC';
        showToast('Showcase: ' + label);
    };
    const showcaseGlyph = showcaseMode === 'static' ? '⑆'
        : showcaseMode === 'generative' ? '⑇'
        : showcaseMode === 'gen-curated' ? '⑈'
        : '⑉';
    const showcaseTitle = showcaseMode === 'static'
        ? 'User Showcase Mode — Static'
        : showcaseMode === 'generative'
            ? 'User Showcase Mode — Generative'
            : showcaseMode === 'gen-curated'
                ? 'User Showcase Mode — Gen Curated'
                : 'User Showcase Mode — Artist';

    // Keep the hex field synced to the live color whenever the user
    // isn't mid-edit and the copy-blink isn't holding the slot.
    useEffect(() => {
        if (editingHexRef.current) return;
        if (copyingHexRef.current) return;
        setHexField(profileHex);
    }, [profileHex]);

    // Build 26 D12 — setup-code field is now live + interactive.
    // The displayed value tracks `currentCode` (encoded from colorway + sort
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
        setInputValue('SETUP CODE COPIED!');
        window.setTimeout(() => {
            copyingRef.current = false;
            setInputValue(currentCode);
        }, 1500);
    };

    /* Share Any View (Brendon 2026-07-19; moved into the Setup Code row by
       his 2026-07-20 call) — ↗ is the catalogued share/send mark. Copies a
       deep link to the exact current view (page, tab, sub-tab, sort,
       grouping), composed at copy time from live state; same field-swap
       feedback as the ⧉ Setup Code copy. */
    const handleShareView = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        const link = composeViewLink(encodeSortSlug(sort, dir, feedKind, group));
        if (!link) return;
        try {
            navigator.clipboard?.writeText(link);
        } catch {
            // ignore
        }
        copyingRef.current = true;
        setInputValue('VIEW LINK COPIED!');
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

    /* Build 29 D28 — every mode toggle emits a toast on flip; format is
       the house standard `Descriptor: STATUS` with the status ALLCAPS
       (Brendon 2026-06-10). Compute the next state at click time (notifs
       reflects the pre-toggle value) and toast it. The body-class
       follow-through still rides on PdNotifsContext via useBodyClass. */
    const toggleWithToast = (key: keyof PdNotifs, label: string) => {
        const next = !notifs[key];
        toggle(key);
        showToast(`${label}: ${next ? 'ON' : 'OFF'}`);
    };

    /* Negative-flag variant — asciiId and sticker are stored inverted:
       flag=false means feature ON, flag=true means feature OFF (NASC /
       NSTK in SetupCode). Toast and active state must be flipped so the
       UI reads correctly: pressing when feature is ON toasts "...OFF",
       pressing when feature is OFF toasts "...ON". */
    const toggleWithToastNeg = (key: keyof PdNotifs, label: string) => {
        const next = !notifs[key];
        /* Sticker Mode: cut the stickers out in the SAME tick the button fires,
           alongside its normal toggle/toast — no lag frame before they vanish
           (Brendon, 2026-06-24). useBodyClass reconciles the class afterwards. */
        if (key === 'sticker' && typeof document !== 'undefined') {
            document.body.classList.toggle('sticker-mode', next);
        }
        toggle(key);
        showToast(`${label}: ${next ? 'OFF' : 'ON'}`);
    };

    /* Brendon list item 7 — Pure Light / Pure Dark mode parity.
       Sim 9308-9320 togglePure(mode):
         1. Flip pdNotifs.pure_light / pdNotifs.pure_dark.
         2. Persist to localStorage (the toggle() helper handles this).
         3. Dispatch pd:pure-mode-changed so ColorwayContext re-applies
            on the active colorway key (picks up the bg-hex override).
         4. If now ON: setAndSaveTheme(mode) — switch colorway to light/dark
            AND persist (so the user's saved colorway becomes light/dark).
         5. If now OFF: setColorway(savedKey) — restore whatever colorway is
            in localStorage (which may itself be 'light' or 'dark', but
            with the pure flag now false, applyColorway returns the standard
            #e0e0e0 / #1a1a1a bg).
         6. Toast 'Pure Light/Dark ON/OFF'. */
    const togglePure = (mode: 'light' | 'dark') => {
        const stateKey = (mode === 'light' ? 'pure_light' : 'pure_dark') as keyof PdNotifs;
        /* Brendon 2026-06-10 — pressing Pure X ALWAYS lands you in X mode.
           If the flag is somehow on while the colorway has drifted elsewhere
           (e.g. pure dark left on, colorway later changed to light), a press
           must RE-ASSERT dark — not silently toggle the flag off. So: the
           press only reads as "turn OFF" when the flag is on AND we're
           actually sitting in that mode. */
        const drifted = !!notifs[stateKey] && colorway !== mode;
        const next = drifted ? true : !notifs[stateKey];
        if (drifted) {
            setColorway(mode);
            showToast(`${mode === 'light' ? 'Pure Light' : 'Pure Dark'}: ON`);
            try {
                window.dispatchEvent(new CustomEvent('pd:pure-mode-changed'));
            } catch { /* SSR-safe ignore */ }
            return;
        }

        // CRITICAL ORDERING: applyColorway reads pure_light/pure_dark from
        // localStorage (ColorwayContext lives upstream of PdNotifsContext, so
        // it can't useNotifs() — it reads LS directly). React state +
        // PdNotifs → LS sync goes through a useEffect that fires AFTER
        // the next commit, but setColorway(mode) below synchronously calls
        // applyColorway which reads LS. So we MUST write the new flag to LS
        // here, BEFORE setColorway, or applyColorway reads the stale value and
        // the bg-hex override misses by one click. The PdNotifs effect
        // will later re-write LS with the same value once the React state
        // commit catches up — safe no-op.
        /* NOTE (Brendon 2026-06-10): pure light and pure dark are
           INDEPENDENT — both may be ON at once. Each one is a per-mode
           modifier (pure white when in light, pure black when in dark);
           turning one on must NEVER touch the other. */
        try {
            const raw = localStorage.getItem('pd_settings_notifs');
            const parsed: Record<string, unknown> = raw ? JSON.parse(raw) : {};
            parsed[stateKey] = next;
            localStorage.setItem('pd_settings_notifs', JSON.stringify(parsed));
        } catch {
            /* private mode / quota — applyColorway will read whatever LS has,
               worst case the override misses one click. */
        }

        toggle(stateKey);

        if (next) {
            // Sim 9314 — setAndSaveColorway(mode). setColorway via context
            // already writes the colorway to localStorage in its callback.
            setColorway(mode);
        } else {
            // Sim 9316 — setColorway(localStorage.getItem('pd_settings_colorway') || 'custom').
            try {
                const saved = localStorage.getItem('pd_settings_colorway');
                const valid = saved && (saved === 'custom' || saved === 'light' || saved === 'dark' || saved === 'orange' || saved === 'blue' || saved === 'red')
                    ? (saved as 'custom' | 'light' | 'dark' | 'orange' | 'blue' | 'red')
                    : 'custom';
                setColorway(valid);
            } catch {
                setColorway('custom');
            }
        }

        // Belt-and-suspenders re-apply for the case where setColorway above
        // was a no-op (e.g. pure_dark flipping while colorway is already
        // 'dark' — setColorway('dark') sees no colorway change but applyColorway
        // still needs to fire to pick up the new pure flag).
        try {
            window.dispatchEvent(new CustomEvent('pd:pure-mode-changed'));
        } catch {
            /* SSR-safe ignore */
        }

        showToast(`${mode === 'light' ? 'Pure Light' : 'Pure Dark'}: ${next ? 'ON' : 'OFF'}`);
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
                        style={{ cursor: 'default', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
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
                    <span
                        className="setup-code-copy setup-code-share"
                        onClick={handleShareView}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleShareView(e);
                            }
                        }}
                        title="Share this view — copy a link that restores this exact page, tab, sort, and grouping"
                        role="button"
                        tabIndex={0}
                    >
                        ↗{'\uFE0E'}
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
                    {/* F64 (BUG-28) — iOS native color picker fix.
                        Sim 4610-4613 wraps the hidden <input type="color">
                        inside a <label> — a label click is a trusted user
                        gesture on iOS so the native picker fires. A
                        programmatic ref.click() is untrusted and blocked.
                        Replicated here: <label htmlFor> on the pill,
                        hidden input lives inside it. No onClick needed. */}
                    <label
                        htmlFor="profileColorPicker"
                        className="settings-toggle"
                        id="sn-profileTheme"
                        title="Choose Profile Colorway"
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="st-icon" aria-hidden="true">◩{'\uFE0E'}</span>
                        <span className="st-label">PROFILE COLORWAY</span>
                        <input
                            ref={colorPickerRef}
                            type="color"
                            id="profileColorPicker"
                            value={profileHex}
                            onChange={(e) => setProfileHex(e.target.value)}
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
                    </label>
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
                                setProfileHex(v);
                            }
                        }}
                        onBlur={() => {
                            editingHexRef.current = false;
                            if (!/^#[0-9A-F]{6}$/i.test(hexField)) {
                                // Invalid hex on blur — revert to the
                                // last known good color.
                                setHexField(profileHex);
                            } else {
                                // Normalize casing for valid input.
                                setHexField(hexField.toUpperCase());
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                                setHexField(profileHex);
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
                                navigator.clipboard?.writeText(profileHex);
                            } catch {
                                // ignore
                            }
                            copyingHexRef.current = true;
                            setHexField('COPIED!');
                            window.setTimeout(() => {
                                copyingHexRef.current = false;
                                setHexField(profileHex);
                            }, 1500);
                        }}
                    >
                        ⧉{'\uFE0E'}
                    </span>
                    {/* Profile Page v0 — User Showcase mode toggle. Lives
                        right of the copy-hex button per spec. Glyph
                        flips on tap: ⑆ static (default) ↔ ⑇ generative.
                        Visual + persistence only for v0; the User Showcase
                        grid that reads this flag lands when the slot
                        model + Add-to-User-Showcase action arrive. */}
                    <span
                        className="copy-hex-btn user-showcase-toggle-btn"
                        title={showcaseTitle}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            cycleUserShowcaseMode();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                cycleUserShowcaseMode();
                            }
                        }}
                    >
                        {showcaseGlyph}
                        {'\uFE0E'}
                    </span>
                    {/* Profile Tags door (Brendon, 2026-08-15) — same action
                        as long-pressing your own @name; just a more obvious
                        door, sitting right beside the showcase glyph. */}
                    <span
                        className="copy-hex-btn profile-tags-door-btn"
                        title="Profile Tags"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            openProfileTagsDoor();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openProfileTagsDoor();
                            }
                        }}
                    >
                        {'\u2311'}
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
                        onClick={() => {
                            const next = !notifs.priceLogo;
                            toggle('priceLogo');
                            showToast(`Logo: ${next ? '$PRICE' : 'Standard'}`);
                        }}
                        icon={<PerMilleMark style={{ height: '12px', width: 'auto', display: 'block' }} />}
                        iconStyle={{
                            /* The REAL per-mille logo mark (SVG), not the ‰ glyph —
                               crisp at every size, no webfont smudge. */
                            display: 'flex',
                            alignItems: 'center',
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
                        title="Sticker Mode — hide your stickers"
                        active={notifs.sticker}
                        onClick={() => toggleWithToastNeg('sticker', 'Sticker Mode')}
                        icon={'⊞\uFE0E'}
                        iconStyle={{ fontSize: '16px', lineHeight: '1', margin: '0 2px', fontWeight: 'normal', position: 'relative', top: '0px' }}
                        iconClassName="sticker-strike"
                        style={{ padding: '0 4px', minWidth: 0, width: 'auto', position: 'relative', overflow: 'visible' }}
                    />
                    <SettingsToggle
                        id="sn-ambient"
                        title="Ambient Strip"
                        active={notifs.ambientStrip}
                        onClick={() => toggleWithToast('ambientStrip', 'Ambient Strip')}
                        icon={'☼\uFE0E'}
                        iconStyle={{ fontSize: '15px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                </div>

                {/* Row 2: Zerocontext / Pricelens / Sentiment / Audience /
                    AsciiId / BackButton / Tape / Autoscroll */}
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
                        icon={'◎\uFE0E'}
                        /* ◎ is the bullseye (U+25CE) — already the correct mark; 13→15px
                           so the center dot reads as a bullseye at row size (2026-07-14). */
                        iconStyle={{ fontSize: '15px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-sentiment"
                        title="Sentiment Weather"
                        active={notifs.sentimentOn}
                        onClick={() => toggleWithToast('sentimentOn', 'Sentiment Weather')}
                        icon={'⛆\uFE0E'}
                        iconStyle={{ fontSize: '14px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-cartel"
                        title="Cartel — you + your mutuals = the Cabal"
                        active={notifs.spell_cartel}
                        onClick={() => {
                            const next = !notifs.spell_cartel;
                            toggle('spell_cartel');
                            showToast(next ? '⟁\uFE0E You + Your Mutuals = The Cabal ⟁\uFE0E' : 'Cartel: OFF');
                        }}
                        icon={'⟁\uFE0E'}
                        iconStyle={{ fontSize: '13px', lineHeight: '1', margin: '0 1px', position: 'relative', top: '1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-asciiId"
                        title="ASCII-ID"
                        active={notifs.asciiId}
                        onClick={() => toggleWithToastNeg('asciiId', 'ASCII-ID')}
                        icon={'\u2362\uFE0E'}
                        iconStyle={{ fontSize: '12px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-backbutton"
                        title="Back Button Mode — a persistent back arrow under the menu"
                        active={notifs.backButton}
                        onClick={() => toggleWithToast('backButton', 'Back Button Mode')}
                        icon={'⇠\uFE0E'}
                        iconStyle={{ fontSize: '15px', lineHeight: '1', margin: '0 1px' }}
                        style={{ padding: '0 5px', minWidth: 0, width: 'auto' }}
                    />
                    <SettingsToggle
                        id="sn-tape"
                        title="Menu Tape"
                        active={notifs.menutape !== 0}
                        onClick={() => {
                            /* Swap (Brendon, 2026-07-13): this pill now owns
                               the MENU tape (0 → 3 → 0, framed mode 4 removed
                               — letters only); the top-menu glyph it traded
                               jobs with runs The Tape's full 5-state cycle. */
                            const next = notifs.menutape === 0 ? 3 : 0;
                            update({ menutape: next as 0 | 3 });
                            showToast('Menu Tape: ' + (next === 0 ? 'OFF' : 'BOLD'));
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
