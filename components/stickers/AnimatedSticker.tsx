'use client';

/*
 * AnimatedSticker — a sprite sticker that breathes: cycles its frames on an
 * interval and renders each as the skinny face chip. Pauses when the tab is
 * hidden so a wall of them stays light.
 */

import { memo, useEffect, useState } from 'react';
import type { Sticker } from '../../lib/stickers/catalog';
import { StickerArt } from './StickerArt';

function AnimatedStickerImpl({
    sticker, size = 44, fill, diecut,
}: {
    sticker: Sticker;
    size?: number;
    fill?: boolean;
    diecut?: boolean;
}) {
    const frames = sticker.frames ?? ['( · )'];
    const [i, setI] = useState(0);
    useEffect(() => {
        if (frames.length <= 1) return;
        let on = true;
        const id = setInterval(() => {
            if (!document.hidden) setI((p) => (p + 1) % frames.length);
        }, 620);
        return () => { on = false; clearInterval(id); void on; };
    }, [frames.length]);

    const face: Sticker = { ...sticker, kind: 'face', glyph: frames[i] ?? frames[0] };
    return <StickerArt sticker={face} size={size} fill={fill} diecut={diecut} />;
}

export const AnimatedSticker = memo(AnimatedStickerImpl);
