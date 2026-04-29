'use client';

/**
 * Layout — manages classes on <body> to mirror the source HTML's body
 * class system (persona-default, theme-*, is-pwa, modal-open, stargazing-mode,
 * spell_*, etc.).
 *
 * Why mutate document.body instead of wrapping with a <div>: the source
 * CSS uses body-level selectors like `body.persona-default .t-artist`
 * and `body.theme-dark .canvas-wrapper` extensively. Putting the classes
 * on a wrapper div would silently break every one of those selectors
 * during the port. Phase 1 sets the foundation correctly so future
 * phases inherit a working selector base.
 *
 * The root layout (app/layout.tsx) stays a server component; this
 * client component is mounted inside <body> and idempotently writes
 * its classes via useEffect.
 *
 * Phase 1 only manages persona-default + is-pwa. Phase 2 adds
 * theme-*, modal-open, and the spell_* classes from PreferencesContext.
 */

import { useEffect, type ReactNode } from 'react';

/** Classes this component is responsible for. Used to scope .add/.remove
 *  so we never clobber classes added by other code (third-party scripts,
 *  inline manipulations, future hooks). */
const MANAGED_CLASSES = ['persona-default', 'is-pwa'] as const;

type LayoutProps = {
    children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        // Mirrors source HTML's runtime PWA check. Standalone matchMedia
        // is unreliable on iOS, so we OR with navigator.standalone.
        const standalone =
            window.matchMedia?.('(display-mode: standalone)')?.matches ||
            // @ts-expect-error — non-standard iOS-only API, intentionally accessed
            window.navigator?.standalone === true;

        // Phase 1 active classes. Extend in Phase 2 from context state.
        const active = new Set<string>(['persona-default']);
        if (standalone) active.add('is-pwa');

        const body = document.body;
        for (const cls of MANAGED_CLASSES) {
            if (active.has(cls)) {
                body.classList.add(cls);
            } else {
                body.classList.remove(cls);
            }
        }

        return () => {
            // Cleanup on unmount — should never run in practice (Layout
            // is mounted at the root) but keeps the contract honest.
            for (const cls of MANAGED_CLASSES) body.classList.remove(cls);
        };
    }, []);

    return <>{children}</>;
}
