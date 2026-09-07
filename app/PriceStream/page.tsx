'use client';

/*
 * /PriceStream — dedicated, bookmarkable URL for the PriceStream feed
 * (Brendon, 2026-09-07). PriceStream itself lives as a modal (ModalContext,
 * name 'pricestream', rendered by PriceStreamFeed inside PriceOSShell,
 * which is mounted globally) — until now the only door in was a single tap
 * on the home "Price Discussion" title, so there was no link to share or
 * bookmark. This route doesn't reimplement the feed; it just opens that
 * same modal on load.
 *
 * Closing the feed from here has no page underneath it to land back on
 * (unlike the home-title tap, which opens over a page already in view), so
 * closing sends the user to '/' instead of stranding them on a blank route.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useModal } from '../../lib/state/ModalContext';

export default function PriceStreamPage() {
    const router = useRouter();
    const { openModal, open } = useModal();
    const openedRef = useRef(false);

    useEffect(() => {
        open('pricestream');
        openedRef.current = true;
    }, [open]);

    useEffect(() => {
        if (openedRef.current && openModal === null) {
            router.replace('/');
        }
    }, [openModal, router]);

    return null;
}
