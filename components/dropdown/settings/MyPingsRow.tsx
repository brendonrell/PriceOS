'use client';

/*
 * MyPingsRow
 *
 * Settings panel section 5 — MY PINGS.
 *
 * Per-category notification preferences. Each toggle flips an entry in
 * pdNotifs.pings (or top-level pdNotifs for nightmode / pingToasts).
 *
 * pingToasts and nightmode aren't in pdNotifs.pings (which is a sub-
 * object holding the four event-category flags). pingToasts is now
 * top-level (Brendon item 11, chat A) and toggles inline.
 *
 * S2 logged-out preview:
 *   Full section auth-gated when !isAuthed — Pingtoasts master toggle,
 *   per-category ping toggles (mints/lists/offers/xfers/mutuals), and
 *   Silent Mode all become inert. Section stays visible so the logged-
 *   out user sees the shape of the personal notification preferences.
 */

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePdNotifs, PING_TOAST_CYCLE, showsNativePings } from '../../../lib/state/PdNotifsContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useAuth } from '../../../lib/state/AuthContext';
import { enableNativePings, getNativeStatus, nativePushSupported } from '../../../lib/push/client';
import { SettingsToggle } from './SettingsToggle';

export function MyPingsRow() {
    const { notifs, update, toggle } = usePdNotifs();
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const gatedClass = isAuthed ? '' : ' auth-gated';

    /* 3D Pingtoasts (native push) — is this device already granted + subscribed?
       Drives whether cycling onto a native mode shows the inline enable prompt. */
    const [nativeOn, setNativeOn] = useState(false);
    const [show3dConfirm, setShow3dConfirm] = useState(false);
    // The confirm bubble renders in a body-level portal (top layer, never
    // clipped); these hold the pill's measured position to place it.
    const cellRef = useRef<HTMLSpanElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    // pillCenterX = where the tail must point; top = pill's top edge.
    const [confirmPos, setConfirmPos] = useState<{ top: number; pillCenterX: number } | null>(null);
    // Computed once the bubble is measured: centerX = clamped on-screen centre,
    // tailDx = tail's offset from that centre so it still aims at the pill.
    const [bubbleLayout, setBubbleLayout] = useState<{ centerX: number; tailDx: number } | null>(null);
    useEffect(() => {
        let live = true;
        getNativeStatus().then((s) => {
            if (live) setNativeOn(s.subscribed && s.permission === 'granted');
        });
        return () => { live = false; };
    }, []);

    /* Tapping the inline "Enable 3D Pingtoasts?" bubble fires Apple's allow-
       prompt (this tap is the required user gesture) + registers the device. */
    const confirm3d = async () => {
        const result = await enableNativePings();
        setShow3dConfirm(false);
        if (result === 'enabled') { setNativeOn(true); showToast('3D Pingtoasts: ON'); }
        else if (result === 'denied') showToast('3D Pingtoasts: BLOCKED');
        else if (result === 'unsupported') showToast('3D Pingtoasts: ADD TO HOME SCREEN FIRST');
        else showToast('3D Pingtoasts: FAILED');
    };

    /* Native push only works where the platform supports it — on iOS that means
       the app is added to the home screen. When it can't be enabled here, the
       Yes button is greyed. */
    const canEnableNative = nativePushSupported();

    const togglePingCat = (key: keyof typeof notifs.pings) => {
        const PING_LABELS: Record<string, string> = {
            mints:    'Mints Pings',
            lists:    'Lists Pings',
            offers:   'Offers Pings',
            xfers:    'Xfers Pings',
            mutuals:  'Mutuals Pings',
            artists:  'Artists Pings',
            projects: 'Projects Pings',
            traits:   'Traits Pings',
            rarity:   'Rarity Pings',
        };
        const next = !notifs.pings[key];
        update({ pings: { ...notifs.pings, [key]: next } });
        showToast(`${PING_LABELS[key] ?? key}: ${next ? 'ON' : 'OFF'}`);
    };

    // Cycle the Pingtoasts mode: OFF → ON → 3D → COMBO → OFF.
    //   ON    = in-app toasts + the connect-icon badge (works in mobile Safari)
    //   3D    = native OS notifications (opt-in — needs the allow-prompt below)
    //   COMBO = both at once
    // Landing on a native mode (3D / COMBO) without native enabled raises the
    // inline "Enable 3D Pingtoasts?" bubble above the pill; cycling onward past
    // the native modes dismisses it. The allow-prompt fires only on that tap.
    const cyclePingToasts = () => {
        const i = PING_TOAST_CYCLE.indexOf(notifs.pingToasts);
        const next = PING_TOAST_CYCLE[(i + 1) % PING_TOAST_CYCLE.length];
        update({ pingToasts: next });
        showToast(`Pingtoasts: ${next.toUpperCase()}`);
        const show = showsNativePings(next) && !nativeOn;
        if (show && cellRef.current) {
            const r = cellRef.current.getBoundingClientRect();
            setBubbleLayout(null); // re-measure for this position
            setConfirmPos({ top: r.top, pillCenterX: r.left + r.width / 2 });
        }
        setShow3dConfirm(show);
    };

    /* Dismiss the confirm bubble on anything that should close it: a tap outside
       the bubble (which covers closing the whole menu — that tap lands outside),
       or a scroll/resize that would leave the body-level portal floating in the
       wrong place. Without this it lingered on screen after the menu closed. */
    useEffect(() => {
        if (!show3dConfirm) return;
        const onPointerDown = (e: PointerEvent) => {
            if (bubbleRef.current?.contains(e.target as Node)) return;
            setShow3dConfirm(false);
        };
        const dismiss = () => setShow3dConfirm(false);
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [show3dConfirm]);

    /* Place the confirm bubble: keep it fully on-screen (clamp its centre so
       neither edge is cut off), then point the tail back at the pill wherever
       the bubble lands. Measured after mount; hidden for that one frame. */
    useEffect(() => {
        if (!show3dConfirm || !confirmPos || !bubbleRef.current) return;
        const w = bubbleRef.current.offsetWidth;
        const half = w / 2;
        const margin = 8;
        const vw = window.innerWidth;
        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
        // Centre the bubble on the pill, but never let an edge cross the margin.
        const centerX = clamp(confirmPos.pillCenterX, margin + half, vw - margin - half);
        // Tail aims at the pill, but stays within the bubble's rounded body.
        const tailDx = clamp(confirmPos.pillCenterX - centerX, -(half - 12), half - 12);
        setBubbleLayout({ centerX, tailDx });
    }, [show3dConfirm, confirmPos]);

    return (
        <>
            <div className={`settings-header${gatedClass}`}>MY PINGS</div>
            <div className={`settings-pill-row${gatedClass}`}>
                <span className="pingtoast-cell" ref={cellRef}>
                <SettingsToggle
                    id="sn-pingToasts"
                    title={`Pingtoasts: ${notifs.pingToasts.toUpperCase()} — tap to cycle`}
                    active={notifs.pingToasts !== 'off'}
                    onClick={cyclePingToasts}
                    icon={'⇡\uFE0E'}
                    iconStyle={{ fontSize: '14px', lineHeight: '1', marginRight: 0 }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                </span>
                <SettingsToggle
                    id="sn-mints"
                    title="Mint Pings"
                    active={notifs.pings.mints}
                    onClick={() => togglePingCat('mints')}
                    icon={'✶\uFE0E'}
                    label="MINTS"
                />
                <SettingsToggle
                    id="sn-lists"
                    title="List Pings"
                    active={notifs.pings.lists}
                    onClick={() => togglePingCat('lists')}
                    icon={'✹\uFE0E'}
                    label="LISTS"
                />
                <SettingsToggle
                    id="sn-offers"
                    title="Offer Pings"
                    active={notifs.pings.offers}
                    onClick={() => togglePingCat('offers')}
                    icon={'✦\uFE0E'}
                    label="OFFERS"
                />
                <SettingsToggle
                    id="sn-xfers"
                    title="Transfer Pings"
                    active={notifs.pings.xfers}
                    onClick={() => togglePingCat('xfers')}
                    icon={'✸\uFE0E'}
                    label="XFERS"
                />
                <SettingsToggle
                    id="sn-mutualsOnly"
                    title="Mutuals Pings — relevant activity from your mutuals"
                    active={notifs.pings.mutuals}
                    onClick={() => togglePingCat('mutuals')}
                    icon={'⚭\uFE0E'}
                    iconBare
                    iconStyle={{ fontSize: '14.5px', lineHeight: '1', transform: 'translateY(-1px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-artists"
                    title="Artists Pings — a starred artist lists, sells, or drops"
                    active={notifs.pings.artists}
                    onClick={() => togglePingCat('artists')}
                    icon={'✺︎'}
                    iconBare
                    iconStyle={{ fontSize: '15px', lineHeight: '1', transform: 'translateY(0px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-projects"
                    title="Projects Pings — activity on your starred projects"
                    active={notifs.pings.projects}
                    onClick={() => togglePingCat('projects')}
                    icon={'⬚︎'}
                    iconBare
                    iconStyle={{ fontSize: '14.5px', lineHeight: '1', transform: 'translateY(-1px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-traits"
                    title="Traits Pings — a piece carrying a starred trait moves"
                    active={notifs.pings.traits}
                    onClick={() => togglePingCat('traits')}
                    icon={'⨝︎'}
                    iconBare
                    iconStyle={{ fontSize: '14px', lineHeight: '1', transform: 'translateY(1px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-rarity"
                    title="Rarity Pings — top-10 rarest pieces move in projects you hold"
                    active={notifs.pings.rarity}
                    onClick={() => togglePingCat('rarity')}
                    icon={'❖︎'}
                    iconBare
                    iconStyle={{ fontSize: '15px', lineHeight: '1' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-nightmode"
                    title="Silent Mode"
                    active={notifs.nightmode}
                    onClick={() => {
                        const next = !notifs.nightmode;
                        toggle('nightmode');
                        showToast(`Silent Mode: ${next ? 'ON' : 'OFF'}`);
                    }}
                    icon={'⏾\uFE0E'}
                    iconBare
                    iconStyle={{ fontSize: '14px', lineHeight: '1', transform: 'translateY(2px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
            </div>
            {show3dConfirm && confirmPos && typeof document !== 'undefined' &&
                createPortal(
                    /* Keyed on the mode so it remounts + replays the flash each
                       time the cycle switches between 3D and COMBO — a clear
                       signal that the state changed. */
                    <div
                        key={notifs.pingToasts}
                        ref={bubbleRef}
                        className="pingtoast-3d-confirm"
                        role="dialog"
                        style={{
                            top: confirmPos.top,
                            left: bubbleLayout?.centerX ?? confirmPos.pillCenterX,
                            transform: 'translate(-50%, calc(-100% - 8px))',
                            visibility: bubbleLayout ? 'visible' : 'hidden',
                            ['--p3d-tail-dx' as string]: `${bubbleLayout?.tailDx ?? 0}px`,
                        } as CSSProperties}
                    >
                        <span className="p3d-q">Enable 3D Pingtoasts?</span>
                        <button
                            type="button"
                            className="p3d-btn p3d-yes"
                            disabled={!canEnableNative}
                            onClick={(e) => { e.stopPropagation(); void confirm3d(); }}
                        >
                            {'  Yes  '}
                        </button>
                    </div>,
                    document.body,
                )}
        </>
    );
}
