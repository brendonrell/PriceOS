'use client';

/*
 * PanopticonOverlay — the live "who's watching what" panel for the Panopticon
 * spell. Mounted once in PriceOSShell. Runs usePanopticonPresence (which also
 * broadcasts the viewer's own presence while the spell is on) and renders a
 * compact floating watch-list of the other Panopticon-active users + the exact
 * piece/page each is looking at. Renders nothing unless the spell is on.
 */

import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { usePanopticonPresence } from '../../lib/hooks/usePanopticonPresence';

const VS15 = '︎';

export default function PanopticonOverlay() {
    const { notifs } = usePdNotifs();
    const watchers = usePanopticonPresence();
    if (!notifs.spell_panopticon) return null;

    return (
        <div className="panopticon-overlay" role="status" aria-label="Panopticon — who is watching">
            <div className="pan-ov-head">
                <span className="pan-ov-glyph">{`⎌${VS15}`}</span>
                <span className="pan-ov-title">PANOPTICON</span>
                <span className="pan-ov-count">{watchers.length}</span>
            </div>
            {watchers.length === 0 ? (
                <div className="pan-ov-empty">no one else is watching</div>
            ) : (
                <div className="pan-ov-list">
                    {watchers.map((w) => (
                        <div className="pan-ov-row" key={w.id}>
                            <span className="pan-ov-dot">{`●${VS15}`}</span>
                            <span className="pan-ov-name">{w.name}</span>
                            {w.view && <span className="pan-ov-view">{w.view}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
