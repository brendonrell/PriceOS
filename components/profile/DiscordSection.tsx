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

export default function DiscordSection({
    discordId,
    discordUsername,
    isOwnProfile,
    isAuthed,
}: {
    discordId: string | null;
    discordUsername: string | null;
    isOwnProfile: boolean;
    isAuthed: boolean;
}) {
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
                        <img className="pd-discord-avatar" src={defaultAvatarUrl(discordId!)} alt="" width={48} height={48} />
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
                Join the PD Discord
                <span className="pd-discord-join-arrow">→</span>
            </a>
        </div>
    );
}
