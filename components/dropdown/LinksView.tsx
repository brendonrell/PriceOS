'use client';

/*
 * LinksView
 *
 * The default view inside the main user-dropdown panel:
 *   - Profile (with follower / following counts; links to /{siweAddress}
 *              when authenticated, falls back to /brendon if not)
 *   - Discord
 *   - Artists   (clicking swaps the user-dropdown to the Artists panel)
 *   - Portfolio (similar)
 *   - Settings  (with inline gas widget; clicks swap to Settings panel)
 *   - Log Out   (calls AuthContext.signOut → DELETE session + wagmi
 *                disconnect + close menu)
 *     — OR —
 *   - Connect Wallet (logged-out, S2) — fires the RainbowKit modal via
 *                useConnectModal in place of Log Out.
 *
 * Artists / Portfolio / Settings / Calendar panels swap into the same
 * dropdown slot via DropdownContext.setView, keeping the dropdown
 * footprint stable.
 *
 * Follower / following counts stay mocked at 850 / 2.2k — they wire to
 * real values when the indexer + follow graph land. Same FollowersModal
 * pattern (modal already exists, harmless pre-launch).
 *
 * S2 logged-out preview:
 *   When !isAuthed, the Profile row and Portfolio link get the
 *   `auth-gated` class (opacity 0.4 + pointer-events: none + user-
 *   select: none — see app/globals.css). They remain visible so the
 *   logged-out user sees the menu's full shape, but they don't fire
 *   anything. The bottom CTA swaps from Log Out to Connect Wallet,
 *   which fires the RainbowKit modal directly.
 *
 * ── PARKED DEVIATION FROM SIM (2026-05-02, Brendon) ─────────────────
 * The Profile link USES `flex: 1` deliberately. Sim does NOT — sim's
 * profile row leaves the link at natural width, which clusters the
 * follower / following stats next to the "Profile" label (12px gap
 * from .nav-follower-stats margin-left). Brendon prefers the layout
 * where the link expands to fill the row, pushing the stats hard
 * against the right edge of the dropdown panel. This is intentional.
 * Do not "restore parity with sim" by removing flex: 1 — the
 * deviation is deliberate and Brendon-approved. If sim ever changes
 * to match this, delete this comment block.
 * ────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { openConnectModal } from '../../lib/wallet/walletBus';
import { DISCORD_URL } from '../../lib/config/discord';
import { useGasData } from '../../lib/hooks/useGasData';
import { fmtFollowers } from '../../lib/social/useArtistSocial';
import { hasStudioAccess } from '../../lib/studio/access';

export function LinksView() {
    const { setView, closeMenu } = useDropdown();
    const { open } = useModal();
    const { siweAddress, handle, signOut } = useAuth();
    const { showToast } = useToast();

    const isAuthed = !!siweAddress;

    /* PD Studio is its own app (Studio / Docs / MCP — the coder+agent side
       of PD), so on /studio the SAME menu chrome carries a fresh links list
       built around that app (Brendon, 2026-07-11): Dashboard · Analytics ·
       Docs · MCP · Support (Stickers for the access list). Everything else —
       search bar, settings row, log-out pill, sizing — is untouched. */
    const pathname = usePathname();
    const onStudio = pathname === '/studio' || pathname?.startsWith('/studio/');
    const [studioGod, setStudioGod] = useState(false);
    useEffect(() => {
        if (onStudio) setStudioGod(hasStudioAccess(siweAddress ?? undefined));
    }, [onStudio, siweAddress]);

    /* Real follower / following counts for the signed-in wallet. */
    const [followCounts, setFollowCounts] = useState<{ followers: number; following: number } | null>(null);
    useEffect(() => {
        if (!siweAddress) { setFollowCounts(null); return; }
        let cancel = false;
        fetch(`/api/follows/${siweAddress}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancel || !d) return;
                setFollowCounts({
                    followers: typeof d.follower_count === 'number' ? d.follower_count : 0,
                    following: typeof d.following_count === 'number' ? d.following_count : 0,
                });
            })
            .catch(() => {});
        return () => { cancel = true; };
    }, [siweAddress]);

    /* Link STRAIGHT to the handle (/{handle}) — the same single, colour-booted
       hop every other profile uses. The /{address} URL only 301-redirects to
       /{handle} server-side, and that middle hop renders a blank page with no
       profile colour: that's the "white wall" that hit ONLY your own profile
       opened from here (Brendon, 2026-06-25 — the core action, must be perfect).
       Fall back to the address (which redirects) only until the handle resolves. */
    const profileHref = handle ? `/${handle}` : siweAddress ? `/${siweAddress}` : '/brendon';

    const gas = useGasData(true);
    const gasValue = gas.data
        ? gas.data.standardGwei < 10
            ? gas.data.standardGwei.toFixed(2)
            : gas.data.standardGwei.toFixed(1)
        : '—';

    const handleLogOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await signOut();
        closeMenu();
    };

    const handleConnectWallet = () => {
        /* Bus-routed since the wallet-stack split: opens immediately when
           the stack is resident (the common case — it's idle-prefetched),
           queues-and-loads on a cold tap, and falls back to the same toast
           only if the chunk actually failed to load. */
        openConnectModal(() =>
            showToast('Wallet: NOT READY — refresh and try again'),
        );
    };

    if (onStudio) {
        return (
            <div className="dropdown-menu-links" id="dropdownMenuLinks">
                <a href="/studio" onClick={() => closeMenu()}>Dashboard</a>
                <a href="/studio#analytics" onClick={() => closeMenu()}>Analytics</a>
                <a href="/docs" data-native-nav="">Docs</a>
                <a href="/docs/mcp" data-native-nav="">MCP</a>
                {studioGod ? (
                    <a href="/studio#stickers" onClick={() => closeMenu()}>Stickers</a>
                ) : (
                    <a
                        href={DISCORD_URL}
                        onClick={(e) => { e.preventDefault(); window.open(DISCORD_URL, '_blank', 'noopener,noreferrer'); }}
                    >
                        Support
                    </a>
                )}

                <a
                    role="button"
                    tabIndex={0}
                    className="settings-row"
                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                    onClick={(e) => { e.preventDefault(); setView('settings'); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('settings'); }
                    }}
                >
                    <span>Settings</span>
                    <span
                        className="gas-widget gas-widget-inline"
                        id="gasWidget"
                        role="button"
                        tabIndex={0}
                        title="Open gas tracker"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); open('gasTracker'); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open('gasTracker'); }
                        }}
                    >
                        <span style={{ position: 'relative', top: 2 }}>{gasValue} gwei</span>{' '}
                        <span className="gas-glyph">⍞</span>
                    </span>
                </a>

                <div className="dropdown-divider" />

                {isAuthed ? (
                    <button className="dropdown-pill" type="button" onClick={handleLogOut}>
                        Log Out <span className="logout-icon">↬{'︎'}</span>
                    </button>
                ) : (
                    <button className="dropdown-pill" type="button" onClick={handleConnectWallet} title="Connect a wallet to sign in">
                        Connect Wallet <span className="logout-icon">⟠{'︎'}</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="dropdown-menu-links" id="dropdownMenuLinks">
            <div
                id="profileRow"
                className={!isAuthed ? 'auth-gated' : undefined}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <a
                    href={isAuthed ? profileHref : undefined}
                    style={{ flex: 1 }}
                >
                    Profile
                </a>
                {isAuthed && (
                <span
                    className="nav-follower-stats"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                >
                    <span
                        className="nav-stat-link"
                        role="button"
                        tabIndex={0}
                        title="Followers"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            open('followers', 'followers');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                open('followers', 'followers');
                            }
                        }}
                    >
                        <span className="nav-ico nav-ico-followers">
                            ⚬{'\uFE0E'}
                        </span>
                        {' '}&nbsp;
                        <b>{followCounts ? fmtFollowers(followCounts.followers) : '—'}</b>
                    </span>
                    <span
                        className="nav-stat-link"
                        role="button"
                        tabIndex={0}
                        title="Following"
                        style={{ marginLeft: 12 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            open('followers', 'following');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                open('followers', 'following');
                            }
                        }}
                    >
                        <span className="nav-ico nav-ico-following">
                            ⚯{'\uFE0E'}
                        </span>
                        {' '}&nbsp;
                        <b>{followCounts ? fmtFollowers(followCounts.following) : '—'}</b>
                    </span>
                </span>
                )}
            </div>

            <a
                href={DISCORD_URL}
                onClick={(e) => { e.preventDefault(); window.open(DISCORD_URL, '_blank', 'noopener,noreferrer'); }}
            >
                Discord
            </a>

            <a
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.preventDefault();
                    setView('artists');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('artists');
                    }
                }}
            >
                Artists
            </a>

            <a
                role="button"
                tabIndex={isAuthed ? 0 : -1}
                className={!isAuthed ? 'auth-gated' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.preventDefault();
                    if (!isAuthed) return;
                    setView('portfolio');
                }}
                onKeyDown={(e) => {
                    if (!isAuthed) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('portfolio');
                    }
                }}
            >
                Portfolio
            </a>

            <a
                role="button"
                tabIndex={0}
                className="settings-row"
                style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                onClick={(e) => {
                    e.preventDefault();
                    setView('settings');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('settings');
                    }
                }}
            >
                <span>Settings</span>
                <span
                    className="gas-widget gas-widget-inline"
                    id="gasWidget"
                    role="button"
                    tabIndex={0}
                    title="Open gas tracker"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        open('gasTracker');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            open('gasTracker');
                        }
                    }}
                >
                    <span style={{ position: 'relative', top: 2 }}>{gasValue} gwei</span>{' '}
                    <span className="gas-glyph">⍞</span>
                </span>
            </a>

            <div className="dropdown-divider" />

            {isAuthed ? (
                <button
                    className="dropdown-pill"
                    type="button"
                    onClick={handleLogOut}
                >
                    Log Out{' '}
                    <span className="logout-icon">↬{'\uFE0E'}</span>
                </button>
            ) : (
                <button
                    className="dropdown-pill"
                    type="button"
                    onClick={handleConnectWallet}
                    title="Connect a wallet to sign in"
                >
                    Connect Wallet{' '}
                    <span className="logout-icon">⟠{'\uFE0E'}</span>
                </button>
            )}
        </div>
    );
}
