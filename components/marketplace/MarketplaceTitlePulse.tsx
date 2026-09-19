'use client';

/*
 * MarketplaceTitlePulse — the "PD Marketplace" title's single-tap Easter
 * egg, mirroring HomeTitleCartography's single-tap → PriceStream gesture
 * (same pointer-down/up + move-cancel mechanics; no long-press or
 * triple-tap here since nothing else competes for taps on this title).
 *
 * Tap toggles Market Pulse Colorway on/off — a subtle lighter/darker bg
 * breathe, marketplace-only, driven by lib/engines/marketPulseEngine and
 * persisted via lib/marketplace/marketPulseStore. This component owns only
 * the tap gesture + toast; MarketplacePageBody owns starting/stopping the
 * actual pulse loop (it has the live feed + current bg to drive it from).
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { isMarketPulseEnabled, setMarketPulseEnabled } from '../../lib/marketplace/marketPulseStore';

const MOVE_CANCEL_PX2 = 100;

export default function MarketplaceTitlePulse() {
    const { showToast } = useToast();
    const startPt = React.useRef<{ x: number; y: number } | null>(null);
    const moved = React.useRef(false);

    const onPointerDown = (e: React.PointerEvent) => {
        moved.current = false;
        startPt.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > MOVE_CANCEL_PX2) moved.current = true;
    };
    const endPress = () => {
        const wasPending = startPt.current != null;
        startPt.current = null;
        if (!wasPending || moved.current) return;
        const next = !isMarketPulseEnabled();
        setMarketPulseEnabled(next);
        showToast(`Market Pulse Colorway: ${next ? 'ON' : 'OFF'}`);
    };

    return (
        <h1
            className="project-title"
            style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
        >
            PD Marketplace
        </h1>
    );
}
