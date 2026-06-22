'use client';

/*
 * ProfileLogoMark — renders one Profile Logo: the PD speech-bubble outline in
 * the option's bubble colour, with its mark (a per-mille sign or a PD glyph)
 * carved in the ink colour and centred in the bubble's rounded body.
 *
 * The bubble geometry is the shared navbar logo path (lib/stickers/logoPaths).
 * The mark is plain text (no SVG <text> font-matching headaches) absolutely
 * centred over the bubble body — the per-mille's optical centre in the source
 * art sits at ~51% across, ~43% down, so that's where the glyph lands.
 *
 * Used in the home pop-out picker (small) and as the site chrome override on a
 * profile (navbar-sized).
 */

import { PETEY_BUBBLE_PATH } from '@/lib/stickers/logoPaths';
import { getProfileLogo, DEFAULT_PROFILE_LOGO_ID } from '@/lib/logos/profileLogos';

export default function ProfileLogoMark({
    id,
    size = 40,
}: {
    id: string | null | undefined;
    size?: number;
}) {
    const def =
        getProfileLogo(id) ?? getProfileLogo(DEFAULT_PROFILE_LOGO_ID)!;
    return (
        <span
            className="plogo-mark"
            style={{ width: size, height: size, color: def.bubble }}
            aria-hidden="true"
        >
            <svg className="plogo-bubble-svg" viewBox="0 0 761 655" fill="none">
                <path d={PETEY_BUBBLE_PATH} fill="currentColor" />
            </svg>
            <span
                className={`plogo-glyph${def.font === 'inter' ? ' plogo-glyph-inter' : ''}`}
                style={{ color: def.ink, fontSize: size * 0.46 }}
            >
                {def.glyph}
            </span>
        </span>
    );
}
