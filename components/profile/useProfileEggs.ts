'use client';

/*
 * useProfileEggs — the own-profile hero gestures: the @name long-press
 * colourway egg, the @name triple-tap Profile Logo carousel, and the
 * PriceSprite long-press colour picker, plus the shared colour pill set.
 * Split out of ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import { useMemo, useRef, useState } from 'react';
import { classifyRgb } from '../../lib/art/outputColor';
import { signatureHexFor } from '../../lib/profile/signatureHex';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';

export function useProfileEggs({
    isOwnProfile,
    user,
    displayHandle,
    myProfileHex,
    mySpriteHex,
}: {
    isOwnProfile: boolean;
    user: UserProfileData;
    displayHandle: string;
    myProfileHex: string;
    mySpriteHex: string | null;
}) {
    /* ── Name easter egg — colourway pills ──────────────────────────────
       Long-pressing your OWN @name shoves open an in-flow row of colour
       pills (below the title, pushing the rest of the hero down — never a
       floating overlay). Each pill names + sets the Profile Colorway via the
       shared hook, so the change also reflects live in the Settings field.
       The brand palette plus the user's own HIDDEN signature colour (derived
       from their address; named by our colour-bucket classifier). */
    const [eggOpen, setEggOpen] = useState(false);
    const eggTap = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });
    /* The colorway the user had when they opened the egg — the back pill
       restores it (so a curious tap-through never strands a colour they
       didn't mean to keep). Snapshotted on each open. */
    const preEggHex = useRef<string>(myProfileHex);
    const handleNameTap = () => {
        if (!isOwnProfile) return;
        const now = Date.now();
        const s = eggTap.current;
        s.count = now - s.lastTap > 600 ? 1 : s.count + 1;
        s.lastTap = now;
        if (s.count >= 3) {
            s.count = 0;
            setNameCarouselOpen((v) => !v);
        }
    };

    /* Triple-tap the @name (own profile) → a mini Now-Minting carousel pops up
       — the exact home carousel, Oracle for now, quarter-scale. A distinct
       gesture from the long-press colour egg, which stays (Brendon 2026-06-23). */
    const [nameCarouselOpen, setNameCarouselOpen] = useState(false);
    const nameLpTimer = useRef<number | null>(null);
    const nameLpFired = useRef(false);
    const nameLpStart = useRef<{ x: number; y: number } | null>(null);
    const clearNameLp = () => {
        if (nameLpTimer.current != null) { window.clearTimeout(nameLpTimer.current); nameLpTimer.current = null; }
    };
    const onNamePointerDown = (e: React.PointerEvent) => {
        if (!isOwnProfile) return;
        nameLpFired.current = false;
        nameLpStart.current = { x: e.clientX, y: e.clientY };
        clearNameLp();
        nameLpTimer.current = window.setTimeout(() => {
            nameLpFired.current = true;
            nameLpTimer.current = null;
            setEggOpen((v) => {
                if (!v) preEggHex.current = myProfileHex;
                return !v;
            });
        }, 460);
    };
    const onNamePointerMove = (e: React.PointerEvent) => {
        if (nameLpTimer.current == null || !nameLpStart.current) return;
        const dx = e.clientX - nameLpStart.current.x;
        const dy = e.clientY - nameLpStart.current.y;
        if (dx * dx + dy * dy > 100) clearNameLp();
    };
    const onNamePressEnd = () => clearNameLp();

    /* Long-press the PriceSprite (own profile) → an inline colour picker pops up:
       a native colour wheel + the same colorway pills as the @name egg, with
       Save and an undo button above it. A plain TAP still opens the PriceSprite
       modal. Same gesture chrome as the @name long-press (Brendon 2026-06-23). */
    const [spritePickerOpen, setSpritePickerOpen] = useState(false);
    const spriteLpTimer = useRef<number | null>(null);
    const spriteLpFired = useRef(false);
    const spriteLpStart = useRef<{ x: number; y: number } | null>(null);
    /* The sprite colour in play when the picker opened — undo restores it. */
    const preSpriteHex = useRef<string | null>(mySpriteHex);
    const clearSpriteLp = () => {
        if (spriteLpTimer.current != null) { window.clearTimeout(spriteLpTimer.current); spriteLpTimer.current = null; }
    };
    const onSpritePointerDown = (e: React.PointerEvent) => {
        if (!isOwnProfile) return;
        spriteLpFired.current = false;
        spriteLpStart.current = { x: e.clientX, y: e.clientY };
        clearSpriteLp();
        spriteLpTimer.current = window.setTimeout(() => {
            spriteLpFired.current = true;
            spriteLpTimer.current = null;
            setSpritePickerOpen((v) => {
                if (!v) preSpriteHex.current = mySpriteHex;
                return !v;
            });
        }, 460);
    };
    const onSpritePointerMove = (e: React.PointerEvent) => {
        if (spriteLpTimer.current == null || !spriteLpStart.current) return;
        const dx = e.clientX - spriteLpStart.current.x;
        const dy = e.clientY - spriteLpStart.current.y;
        if (dx * dx + dy * dy > 100) clearSpriteLp();
    };
    const onSpritePressEnd = () => clearSpriteLp();

    const eggPills = useMemo(() => {
        const sig = user.signature_hex ?? signatureHexFor(user.address);
        const s = sig.replace('#', '');
        const sigName = classifyRgb(
            parseInt(s.slice(0, 2), 16) || 0,
            parseInt(s.slice(2, 4), 16) || 0,
            parseInt(s.slice(4, 6), 16) || 0,
        );
        return [
            { name: 'Hothurt Red', hex: '#FF0055' },
            { name: 'Attention Yellow', hex: '#FFE600' },
            { name: 'Dot Black', hex: '#111111' },
            { name: 'Matrix White', hex: '#E0E0E0' },
            { name: '@brendon Blue', hex: '#0109FF' },
            { name: `@${displayHandle} ${sigName}`, hex: sig },
        ];
    }, [user.address, displayHandle]);

    return {
        eggOpen, preEggHex, handleNameTap,
        nameCarouselOpen, nameLpFired, onNamePointerDown, onNamePointerMove, onNamePressEnd,
        spritePickerOpen, spriteLpFired, preSpriteHex,
        onSpritePointerDown, onSpritePointerMove, onSpritePressEnd,
        eggPills,
    };
}
