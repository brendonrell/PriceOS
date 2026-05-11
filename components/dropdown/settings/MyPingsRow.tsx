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

import { usePdNotifs } from '../../../lib/state/PdNotifsContext';
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
        update({ pings: { ...notifs.pings, [key]: !notifs.pings[key] } });
    };

    const handlePingToasts = () => {
        // Toast on every flip.
        const next = !notifs.pingToasts;
        toggle('pingToasts');
        showToast(`Pingtoasts ${next ? 'ON' : 'OFF'}`);
    };

    return (
        <>
            <div className={`settings-header${gatedClass}`}>MY PINGS</div>
            <div className={`settings-pill-row${gatedClass}`}>
                <SettingsToggle
                    id="sn-pingToasts"
                    title="Pingtoasts"
                    active={notifs.pingToasts}
                    onClick={handlePingToasts}
                    icon={'⇡\uFE0E'}
                    iconStyle={{ fontSize: '14px', lineHeight: '1' }}
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
                    onClick={() => toggle('nightmode')}
                    icon={'⏾\uFE0E'}
                    iconBare
                    iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
            </div>
        </>
    );
}
