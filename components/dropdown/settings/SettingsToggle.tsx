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
    /** Optional text label rendered after the icon. */
    label?: ReactNode;
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
    label,
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

    const iconCls =
        'st-icon' +
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
                if (!disabled) onClick?.();
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
            {label !== undefined && <span className="st-label">{label}</span>}
            {badge !== undefined && badge}
        </button>
    );
}
