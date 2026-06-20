'use client';

/*
 * DiscordSection — the profile +More → Discord surface.
 *
 * Discord is the centre of the PD world, so it gets its own home: the profile
 * owner's linked Discord identity (or, on your OWN profile, a Link CTA) plus the
 * always-present "Join the PD Discord" CTA. PUBLIC — renders for everyone,
 * logged in or not.
 *
 * Account ASSOCIATION only — NOT login-with-Discord. We store just the Discord
 * id + username at link time, so that's all we can show; the avatar shown is
 * Discord's default (keyed off the account id), the most we can pull without
 * saving more at link time.
 */

import { DISCORD_URL } from '../../lib/config/discord';

/** Discord's default avatar (the Clyde blob) for a migrated account is keyed
 *  off the snowflake: (id >> 22) % 6. */
function defaultAvatarUrl(discordId: string): string {
    let idx = 0;
    try { idx = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6)); } catch { idx = 0; }
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
/** The real pfp streams from Discord's CDN off the stored hash (no image storage
 *  on our side); falls back to the default blob when there's no custom avatar. */
function avatarUrl(discordId: string, avatar: string | null | undefined): string {
    return avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=80`
        : defaultAvatarUrl(discordId);
}

export default function DiscordSection({
    discordId,
    discordUsername,
    discordAvatar,
    discordAccent,
    discordInServer,
    isOwnProfile,
    isAuthed,
}: {
    discordId: string | null;
    discordUsername: string | null;
    discordAvatar?: string | null;
    discordAccent?: number | null;
    discordInServer?: boolean | null;
    isOwnProfile: boolean;
    isAuthed: boolean;
}) {
    const accentHex = discordAccent != null ? `#${discordAccent.toString(16).padStart(6, '0')}` : null;
    const linked = !!(discordId && discordUsername);
    const link = () => { if (isAuthed) window.location.href = '/api/auth/discord'; };
    const unlink = async () => {
        await fetch('/api/auth/discord', { method: 'DELETE' });
        window.location.reload();
    };

    return (
        <div className="ach-section pd-discord">
            <div className="pd-discord-hero">
                <span className="pd-discord-tag">#price-discussion</span>
            </div>

            <div className="pd-discord-card">
                {linked ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="pd-discord-avatar"
                            src={avatarUrl(discordId!, discordAvatar)}
                            alt=""
                            width={48}
                            height={48}
                            style={accentHex ? { border: `2px solid ${accentHex}` } : undefined}
                        />
                        <div className="pd-discord-meta">
                            <span className="pd-discord-status is-on">● LINKED</span>
                            <a
                                className="pd-discord-handle"
                                href={`https://discord.com/users/${discordId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                @{discordUsername}
                            </a>
                            {discordInServer === true && (
                                <span className="pd-discord-member is-in">✓ In the PD Discord</span>
                            )}
                            {discordInServer === false && (
                                <span className="pd-discord-member">Not in the server yet</span>
                            )}
                        </div>
                        {isOwnProfile && (
                            <button type="button" className="pd-discord-unlink" onClick={unlink}>Unlink</button>
                        )}
                    </>
                ) : (
                    <>
                        <span className="pd-discord-avatar pd-discord-avatar--empty" aria-hidden="true">?</span>
                        <div className="pd-discord-meta">
                            <span className="pd-discord-status">{isOwnProfile ? 'NOT LINKED' : 'NOT LINKED YET'}</span>
                            <span className="pd-discord-sub">
                                {isOwnProfile ? 'Connect your Discord to your PD account.' : ' '}
                            </span>
                        </div>
                        {isOwnProfile && (
                            <button
                                type="button"
                                className={`pd-discord-cta${!isAuthed ? ' auth-gated' : ''}`}
                                onClick={link}
                            >
                                Link Discord
                            </button>
                        )}
                    </>
                )}
            </div>

            <a className="pd-discord-join" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                <svg className="pd-discord-logo" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.291.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Join the PD Discord
                <span className="pd-discord-join-arrow">→</span>
            </a>
        </div>
    );
}
