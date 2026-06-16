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

import { usePdNotifs, PING_TOAST_CYCLE } from '../../../lib/state/PdNotifsContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useAuth } from '../../../lib/state/AuthContext';
import { SettingsToggle } from './SettingsToggle';

export function MyPingsRow() {
    const { notifs, update, toggle } = usePdNotifs();
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const gatedClass = isAuthed ? '' : ' auth-gated';

    const togglePingCat = (key: keyof typeof notifs.pings) => {
        const PING_LABELS: Record<string, string> = {
            mints:   'Mints Pings',
            lists:   'Lists Pings',
            offers:  'Offers Pings',
            xfers:   'Xfers Pings',
            mutuals: 'Mutuals Only',
        };
        const next = !notifs.pings[key];
        update({ pings: { ...notifs.pings, [key]: next } });
        showToast(`${PING_LABELS[key] ?? key}: ${next ? 'ON' : 'OFF'}`);
    };

    // Cycle the Pingtoasts mode: OFF → MONEY → SOCIAL → ALL → OFF. Money = only
    // financial toasts, Social = only friends/achievements/p2p, All = the mix.
    const cyclePingToasts = () => {
        const i = PING_TOAST_CYCLE.indexOf(notifs.pingToasts);
        const next = PING_TOAST_CYCLE[(i + 1) % PING_TOAST_CYCLE.length];
        update({ pingToasts: next });
        showToast(`Pingtoasts: ${next.toUpperCase()}`);
    };

    return (
        <>
            <div className={`settings-header${gatedClass}`}>MY PINGS</div>
            <div className={`settings-pill-row${gatedClass}`}>
                <SettingsToggle
                    id="sn-pingToasts"
                    title={`Pingtoasts: ${notifs.pingToasts.toUpperCase()} — tap to cycle`}
                    active={notifs.pingToasts !== 'off'}
                    onClick={cyclePingToasts}
                    icon={'⇡\uFE0E'}
                    iconStyle={{ fontSize: '14px', lineHeight: '1', marginRight: 0 }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
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
                    label="MUTUALS"
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
                    iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
            </div>
        </>
    );
}
