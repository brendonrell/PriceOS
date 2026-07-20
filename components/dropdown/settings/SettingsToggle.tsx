'use client';

/*
 * SettingsToggle
 *
 * The standard pill used throughout the Settings panel for any
 * binary on/off control. CSS class `.settings-toggle.active` paints
 * the filled state; otherwise it's a hollow outlined pill.
 *
 * Three usage patterns:
 *   - icon + label  → MY PD toggles, Spell Book pills
 *   - icon only     → compact MY PD toggles (Anon, Zen, Sticker, etc.)
 *   - label only    → Default Sort pills
 *
 * Pass the props that fit; missing pieces just don't render.
 */

import type { CSSProperties, ReactNode } from 'react';
import { playSound } from '../../../lib/sound/engine';

interface Props {
    /** DOM id — matches sim's `sn-` / `sb-` / `ss-` prefixed ids. */
    id?: string;
    /** Active (filled) state. */
    active?: boolean;
    /** Tooltip / accessible label. */
    title?: string;
    /** Click handler. */
    onClick?: () => void;
    /** Optional icon glyph. */
    icon?: ReactNode;
    /** Optional inline-style overrides for the icon span (font-size etc.). */
    iconStyle?: CSSProperties;
    /** Extra class on the inner .st-icon span (e.g. `sticker-strike`,
        sim 4623 — pairs with the body.sticker-mode opacity rule). */
    iconClassName?: string;
    /** Use the .sharp-glyph class on the icon for crisp dingbat rendering. */
    sharp?: boolean;
    /** When true, the icon span renders with NO class at all — sim's
        sn-nightmode pattern (sim 4685: `<span style="font-size:12px;
        line-height:1;">⏾</span>`). Skips the .st-icon defaults
        (`margin-right: 4px`, `transform: translateY(1px)`) which fight
        against the trim icon-only pill shape. Mutually exclusive with
        `sharp` and `iconClassName`; if both are set, `iconBare` wins. */
    iconBare?: boolean;
    /** Optional text label rendered after the icon. */
    label?: ReactNode;
    /** Brendon list item 15 — sim 10502-10504 sets ssId.innerHTML
        directly on the button (`'# ID' + idDir` where idDir is a string
        containing the .settings-sort-arrow span). The arrow is therefore
        a DIRECT child of the button. The default React port wraps the
        label in `<span class="st-label">` which shifts the arrow's
        baseline relative to the rest of the label text — visible as
        misalignment. Passing `bareLabel` skips the .st-label wrapper so
        the label children render straight under the button, restoring
        sim's structural parity for the Default Sort row pills. */
    bareLabel?: boolean;
    /** Optional trailing slot rendered after the label. Used for the
        Hammer pill's count badge (sim 4759 hammerBadge). */
    badge?: ReactNode;
    /** Override outer style (compact pills sometimes shrink padding). */
    style?: CSSProperties;
    /** Extra class (e.g. for special pills like price-strike). */
    className?: string;
    /** Disable the pill. */
    disabled?: boolean;
}

export function SettingsToggle({
    id,
    active = false,
    title,
    onClick,
    icon,
    iconStyle,
    iconClassName,
    sharp = false,
    iconBare = false,
    label,
    bareLabel = false,
    badge,
    style,
    className,
    disabled = false,
}: Props) {
    const cls =
        'settings-toggle' +
        (active ? ' active' : '') +
        (className ? ' ' + className : '') +
        (disabled ? ' disabled' : '');

    /* iconBare — sim 4685's bare-span pattern. With NO class, the icon
       span sidesteps `.st-icon { margin-right: 4px; transform:
       translateY(1px) }` which trims the pill width and removes the
       1px nudge. Used by sn-nightmode (Silent Mode). */
    const iconCls = iconBare
        ? undefined
        : 'st-icon' +
          (sharp ? ' sharp-glyph' : '') +
          (iconClassName ? ' ' + iconClassName : '');

    return (
        <button
            type="button"
            id={id}
            className={cls}
            title={title}
            aria-pressed={active}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    // Sound layer: every settings pill flip ticks (no-op
                    // while the sound flag is off).
                    playSound('tick');
                    onClick?.();
                }
            }}
            style={style}
        >
            {icon !== undefined && (
                <span
                    className={iconCls}
                    style={iconStyle}
                    aria-hidden="true"
                >
                    {icon}
                </span>
            )}
            {label !== undefined &&
                (bareLabel ? label : <span className="st-label">{label}</span>)}
            {badge !== undefined && badge}
        </button>
    );
}
