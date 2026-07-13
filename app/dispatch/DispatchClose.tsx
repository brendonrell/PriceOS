'use client';

/*
 * DispatchClose — the standard modal × in The Dispatch's top-right corner.
 * The paper is a full page route, so "close" means leave the mode and land
 * exactly where the reader was: history back when they arrived from inside
 * the app, home when the edition was opened cold (direct/shared link).
 */

import { useRouter } from 'next/navigation';

export default function DispatchClose() {
    const router = useRouter();
    const onClose = () => {
        const cameFromApp =
            window.history.length > 1 &&
            document.referrer.startsWith(window.location.origin);
        if (cameFromApp) router.back();
        else router.push('/');
    };
    return (
        <div
            className="close-hint dp-close"
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClose();
                }
            }}
            title="Close"
        >
            {'×'}
            {'︎'}
        </div>
    );
}
