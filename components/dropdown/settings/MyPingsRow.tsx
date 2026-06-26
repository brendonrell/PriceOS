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

import { useState, useEffect } from 'react';
import { usePdNotifs, PING_TOAST_CYCLE, showsNativePings } from '../../../lib/state/PdNotifsContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useAuth } from '../../../lib/state/AuthContext';
import { enableNativePings, getNativeStatus } from '../../../lib/push/client';
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

    const togglePingCat = (key: keyof typeof notifs.pings) => {
        const PING_LABELS: Record<string, string> = {
            mints:    'Mints Pings',
            lists:    'Lists Pings',
            offers:   'Offers Pings',
            xfers:    'Xfers Pings',
            mutuals:  'Mutuals Only',
            artists:  'Artists Pings',
            projects: 'Projects Pings',
            traits:   'Traits Pings',
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
        setShow3dConfirm(showsNativePings(next) && !nativeOn);
    };

    return (
        <>
            <div className={`settings-header${gatedClass}`}>MY PINGS</div>
            <div className={`settings-pill-row${gatedClass}`}>
                <span className="pingtoast-cell">
                <SettingsToggle
                    id="sn-pingToasts"
                    title={`Pingtoasts: ${notifs.pingToasts.toUpperCase()} — tap to cycle`}
                    active={notifs.pingToasts !== 'off'}
                    onClick={cyclePingToasts}
                    icon={'⇡\uFE0E'}
                    iconStyle={{ fontSize: '14px', lineHeight: '1', marginRight: 0 }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                {show3dConfirm && (
                    <button
                        type="button"
                        className="pingtoast-3d-confirm"
                        onClick={(e) => { e.stopPropagation(); void confirm3d(); }}
                    >
                        Enable 3D Pingtoasts?
                    </button>
                )}
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
                    title="Mutuals Only"
                    active={notifs.pings.mutuals}
                    onClick={() => togglePingCat('mutuals')}
                    icon={'⚭\uFE0E'}
                    iconBare
                    iconStyle={{ fontSize: '14px', lineHeight: '1', transform: 'translateY(2px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-artists"
                    title="Artists Pings — starred artists"
                    active={notifs.pings.artists}
                    onClick={() => togglePingCat('artists')}
                    icon={'✺︎'}
                    iconBare
                    iconStyle={{ fontSize: '14px', lineHeight: '1', transform: 'translateY(1px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-projects"
                    title="Projects Pings — starred projects"
                    active={notifs.pings.projects}
                    onClick={() => togglePingCat('projects')}
                    icon={'⬚︎'}
                    iconBare
                    iconStyle={{ fontSize: '14px', lineHeight: '1', transform: 'translateY(1px)' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
                <SettingsToggle
                    id="sn-traits"
                    title="Traits Pings — starred traits"
                    active={notifs.pings.traits}
                    onClick={() => togglePingCat('traits')}
                    icon={'⨝︎'}
                    iconBare
                    iconStyle={{ fontSize: '14px', lineHeight: '1', transform: 'translateY(2px)' }}
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
        </>
    );
}
