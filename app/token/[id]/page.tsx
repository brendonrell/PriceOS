'use client';

/*
 * /token/[id]
 *
 * Route trigger for the Artwork Modal. Opens ArtworkModal at the URL's
 * id on mount and renders nothing underneath — the modal is the durable
 * surface, the route is just one of its callers (gallery cards trigger
 * via useModal().open('artwork', id) directly without a route change).
 *
 * Closing the modal (Esc, backdrop click, close X) does NOT navigate
 * away. The URL stays put. If a future ship wants close → / behaviour,
 * subscribe to ModalContext close events and call router.replace('/').
 *
 * Invalid ids (non-numeric, ≤ 0) are no-ops; the modal stays closed.
 */

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useModal } from '../../../lib/state/ModalContext';

export default function TokenPage() {
    const params = useParams<{ id: string }>();
    const { open } = useModal();

    useEffect(() => {
        const raw = params?.id;
        if (typeof raw !== 'string') return;
        const id = parseInt(raw, 10);
        if (!Number.isFinite(id) || id <= 0) return;
        open('artwork', id);
    }, [params, open]);

    return null;
}
