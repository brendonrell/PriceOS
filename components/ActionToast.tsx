'use client';

/*
 * ActionToast
 *
 * Single fixed pill at the bottom of the viewport. Reads state from
 * ToastContext. Sim renders this as <div class="ens-copy-toast"
 * id="actionToast"> at line 4960; we keep both class names so the
 * sim's existing CSS hooks port over verbatim.
 */

import { useToast } from '../lib/state/ToastContext';

export default function ActionToast() {
    const { state } = useToast();

    const cls = [
        'ens-copy-toast',
        state.mounted ? 'mounted' : '',
        state.show ? 'show' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={cls} id="actionToast" aria-live="polite" aria-atomic="true">
            {state.msg}
        </div>
    );
}
