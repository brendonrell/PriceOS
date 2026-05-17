'use client';

/*
 * FollowersModal
 *
 * Sim id #followersModal (sim.html 5447–5460). Three tabs sharing one
 * panel: FOLLOWERS / FOLLOWING / MUTUALS. Triggered from the user
 * dropdown LinksView (the ⚬ 850 / ⚯ 2.2k stats next to "Profile" —
 * sim 4510, openFollowersModal('followers' | 'following')). Default
 * tab = followers.
 *
 * The active tab arrives via useModal().openModal.payload — the
 * ModalContext union types `payload` as `number | string`; we accept
 * anything matching FollowersTab, fall back to 'followers'. Tab state
 * after open is owned locally (clicking a pill swaps tab without
 * re-firing open from outside).
 *
 * Mock data ports the three sim arrays verbatim (mockFollowers,
 * mockFollowing, mockMutuals at sim 7457). Live indexer data
 * replaces these when wallet wires up.
 *
 * Hooks discipline: all hooks at the top, internals gate on isOpen.
 */

import {
    useCallback,
    useEffect,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useModal } from '../lib/state/ModalContext';

const VS15 = '\uFE0E';

type FollowersTab = 'followers' | 'following' | 'mutuals';

const TABS: { key: FollowersTab; label: string; icon: string }[] = [
    { key: 'followers', label: 'FOLLOWERS', icon: '\u26AC' },
    { key: 'following', label: 'FOLLOWING', icon: '\u26AF' },
    { key: 'mutuals', label: 'MUTUALS', icon: '\u26AD' },
];

const MOCK_FOLLOWERS = [
    '@matty',
    '@atlasforge',
    '@gmoney',
    '@snowfro',
    '@Darold',
    '@CozomoMedici',
    '@0xVGB',
    '@thefunnyguys',
    '@ClownVamp',
    '@willpop',
    '@siggi',
    '@CCDDBB',
    '@Trinity',
    '@cspok',
    '@rudxane',
    '@piterpasma',
];

const MOCK_FOLLOWING = [
    '@matty',
    '@atlasforge',
    '@snowfro',
    '@rudxane',
    '@siggi',
    '@piterpasma',
    '@mattdesl',
    '@ykx',
    '@ixshells',
    '@tylerxhobbs',
];

const MOCK_MUTUALS = [
    '@matty',
    '@atlasforge',
    '@rudxane',
    '@siggi',
    '@piterpasma',
];

const DATA: Record<FollowersTab, string[]> = {
    followers: MOCK_FOLLOWERS,
    following: MOCK_FOLLOWING,
    mutuals: MOCK_MUTUALS,
};

function isTab(v: unknown): v is FollowersTab {
    return v === 'followers' || v === 'following' || v === 'mutuals';
}

export default function FollowersModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'followers';

    const [tab, setTab] = useState<FollowersTab>('followers');

    /* Sync tab from payload on each open. The opener (LinksView)
       passes 'followers' or 'following'; switchFollowersTab afterwards
       is owned locally. */
    useEffect(() => {
        if (!isOpen) return;
        const payload = openModal?.payload;
        if (isTab(payload)) setTab(payload);
        else setTab('followers');
    }, [isOpen, openModal]);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    const rows = DATA[tab];

    return (
        <div
            id="followersModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={onBackdropClick}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        close();
                    }
                }}
                title="Close"
            >
                {'\u00D7'}
                {VS15}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 320, width: '100%' }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: 6,
                        marginBottom: 12,
                        justifyContent: 'flex-start',
                        flexWrap: 'wrap',
                    }}
                >
                    {TABS.map((t) => (
                        <div
                            key={t.key}
                            id={`fmTab-${t.key}`}
                            className={`pill pill-l2${tab === t.key ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setTab(t.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setTab(t.key);
                                }
                            }}
                            style={{ cursor: 'pointer', minWidth: 90 }}
                        >
                            {t.icon}
                            {VS15} {t.label}
                        </div>
                    ))}
                </div>
                <div
                    className="collectors-list"
                    id="followersListWrap"
                    style={{ maxHeight: 280, minHeight: 280, width: '100%' }}
                >
                    <div
                        id="followersList"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            fontSize: 13,
                            textAlign: 'left',
                            padding: '6px 10px',
                            fontWeight: 'bold',
                            fontFamily: "'Courier New', Courier, monospace",
                        }}
                    >
                        {rows.map((handle) => (
                            <span
                                key={handle}
                                className="hover-link"
                                role="link"
                                tabIndex={0}
                            >
                                {handle}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
