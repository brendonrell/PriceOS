'use client';

/*
 * SuitePhone — ⚯ PricePhone, the Suite's contacts app (Brendon, 2026-07-27;
 * his naming call — "PriceDex" lost to what DEX means in crypto).
 *
 * Contacts = your REAL circle, straight off the same live graph the Friend
 * Inspector reads (/api/follows): mutuals first (⚭), then who you follow
 * (⚯), then who follows you (⚬). CALL is the phone metaphor made market:
 * calling someone means going to their collection and putting an offer on
 * one of their pieces — the CALL key drops you on their profile with the
 * line ringing. Signed-out shows the empty booth.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/state/AuthContext';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';

const VS15 = '︎';

interface Contact {
    handle: string;
    /* ⚭ mutual · ⚯ following · ⚬ follower — the Friend Inspector's own
       relationship glyphs, reused verbatim. */
    rel: 'mutual' | 'following' | 'follower';
}

const REL_GLYPH: Record<Contact['rel'], string> = {
    mutual: '⚭', following: '⚯', follower: '⚬',
};
const REL_ORDER: Contact['rel'][] = ['mutual', 'following', 'follower'];

const lc = (s: string) => s.toLowerCase();

export default function SuitePhone() {
    const { siweAddress } = useAuth();
    const { closeAll } = useModal();
    const { showToast } = useToast();
    const router = useRouter();

    const [contacts, setContacts] = useState<Contact[] | null>(null);

    useEffect(() => {
        const addr = siweAddress?.toLowerCase();
        if (!addr) { setContacts([]); return; }
        let alive = true;
        fetch(`/api/follows/${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive) return;
                const followers: string[] = Array.isArray(j?.follower_handles) ? j.follower_handles : [];
                const following: string[] = Array.isArray(j?.following_handles) ? j.following_handles : [];
                const fset = new Set(followers.map(lc));
                const gset = new Set(following.map(lc));
                const out: Contact[] = [
                    ...following.filter((h) => fset.has(lc(h))).map((h): Contact => ({ handle: h, rel: 'mutual' })),
                    ...following.filter((h) => !fset.has(lc(h))).map((h): Contact => ({ handle: h, rel: 'following' })),
                    ...followers.filter((h) => !gset.has(lc(h))).map((h): Contact => ({ handle: h, rel: 'follower' })),
                ];
                setContacts(out);
            })
            .catch(() => { if (alive) setContacts([]); });
        return () => { alive = false; };
    }, [siweAddress]);

    /* CALL — the line rings and you land on their collection, where the
       offer gets placed on the piece you pick. */
    const call = (c: Contact) => {
        showToast(`PricePhone: CALLING @${c.handle.toUpperCase()}`);
        closeAll();
        router.push(`/${c.handle}`);
    };

    const count = contacts?.length ?? 0;

    return (
        <div className="user-dropdown notifications-box is-open suite-phone">
            <div className="notif-header">
                <span>CONTACTS <span className="notif-count">({count})</span></span>
            </div>
            <div className="dropdown-divider" />
            {!siweAddress && (
                <div className="todo-empty">Connect to see your circle.</div>
            )}
            {siweAddress && contacts === null && (
                <div className="todo-empty">Dialing in…</div>
            )}
            {siweAddress && contacts !== null && contacts.length === 0 && (
                <div className="todo-empty">No contacts yet — your circle fills this book.</div>
            )}
            {contacts !== null && REL_ORDER.map((rel) => {
                const group = contacts.filter((c) => c.rel === rel);
                if (group.length === 0) return null;
                return group.map((c) => (
                    <div key={`${rel}-${c.handle}`} className="suite-ph-row">
                        <span className="suite-ph-rel" title={rel}>{`${REL_GLYPH[rel]}${VS15}`}</span>
                        <span className="suite-ph-name">@{c.handle}</span>
                        <button
                            type="button"
                            className="suite-ph-call"
                            title={`Call @${c.handle} — offer on one of their pieces`}
                            onClick={() => call(c)}
                        >
                            CALL
                        </button>
                    </div>
                ));
            })}
        </div>
    );
}
