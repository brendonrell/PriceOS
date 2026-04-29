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
 * object holding the four event-category flags). Step 4 wires them
 * to top-level pdNotifs slots — pingToasts is a stub flag for now,
 * nightmode wires to pdNotifs.nightmode (already declared).
 */

import { usePdNotifs } from '../../../lib/state/PdNotifsContext';
import { SettingsToggle } from './SettingsToggle';

export function MyPingsRow() {
    const { notifs, update, toggle } = usePdNotifs();

    const togglePingCat = (key: keyof typeof notifs.pings) => {
        update({ pings: { ...notifs.pings, [key]: !notifs.pings[key] } });
    };

    return (
        <>
            <div className="settings-header">MY PINGS</div>
            <div className="settings-pill-row">
                <SettingsToggle
                    id="sn-pingToasts"
                    title="Pingtoasts"
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
                    iconStyle={{ fontSize: '12px', lineHeight: '1' }}
                    style={{ padding: '0 6px', minWidth: 0, width: 'auto' }}
                />
            </div>
        </>
    );
}
