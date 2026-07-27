'use client';

/*
 * DiscordSection — the profile +More → Discord surface (rebuilt 2026-07-27,
 * Brendon: "Discord IS the product for PD so we want an amazing page").
 *
 * Account ASSOCIATION only (not login-with-Discord) — the wallet stays the
 * identity. Renders for everyone, logged in or not.
 *
 * PD chrome throughout (Rule #2 + the corner law): solid --bg-color fills,
 * full-strength --text-color borders + lettering, bold, 12px floor, 4px
 * corners. The ONE brand accent is Discord blurple (#5865F2) on the mark;
 * the user's own Discord accent colour paints their avatar frame.
 *
 * Two states:
 *   • CONNECTED — the identity plate: real Discord pfp (streamed from
 *     Discord's CDN off the stored hash, no image storage), the handle big,
 *     the membership readout, and the doors (open on Discord · unlink).
 *   • NOT CONNECTED — the pitch line + the link door (own profile) and the
 *     join-the-server door (everyone).
 */

import { DISCORD_URL } from '../../lib/config/discord';

/** Discord's brand mark — inline vector (no image asset). */
function DiscordLogo({ size = 18 }: { size?: number }) {
    return (
        <svg className="pd-dc-logo" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.291.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    );
}

/** Discord's default avatar (the Clyde blob) for a hash-less account is keyed
 *  off the snowflake: (id >> 22) % 6. */
function defaultAvatarUrl(discordId: string): string {
    let idx = 0;
    try { idx = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6)); } catch { idx = 0; }
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
/** The real pfp streams from Discord's CDN off the stored hash (no image
 *  storage on our side); falls back to the default blob. */
function avatarUrl(discordId: string, avatar: string | null | undefined): string {
    return avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=96`
        : defaultAvatarUrl(discordId);
}

const VS15 = '︎';

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

    const joinBtn = (
        <a className="pd-dc-btn pd-dc-btn-join" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
            <DiscordLogo />
            <span>JOIN THE PD DISCORD</span>
            <span className="pd-dc-btn-arrow">{`→${VS15}`}</span>
        </a>
    );

    return (
        <div className="ach-section pd-dc" aria-label="Discord">
            <div className="pd-dc-head">
                <DiscordLogo size={16} />
                <span className="pd-dc-head-words">Discord · #price-discussion</span>
            </div>

            {linked ? (
                <>
                    {/* The identity plate — who this wallet is on Discord. */}
                    <a
                        className="pd-dc-plate"
                        href={`https://discord.com/users/${discordId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open on Discord"
                    >
                        <img
                            className="pd-dc-avatar"
                            src={avatarUrl(discordId!, discordAvatar)}
                            alt=""
                            width={48}
                            height={48}
                            style={accentHex ? { borderColor: accentHex } : undefined}
                        />
                        <span className="pd-dc-idcol">
                            <span className="pd-dc-handle">@{discordUsername}</span>
                            <span className="pd-dc-standing">
                                {discordInServer === true
                                    ? `IN THE PD DISCORD ✓${VS15}`
                                    : discordInServer === false ? 'NOT IN THE SERVER YET' : 'LINKED'}
                            </span>
                        </span>
                        <span className="pd-dc-plate-arrow">{`→${VS15}`}</span>
                    </a>

                    {/* The readout row — what the link carries. */}
                    <div className="pd-dc-stats">
                        <span className="pd-dc-stat">
                            <span className="pd-dc-stat-label">STATUS</span>
                            <span className="pd-dc-stat-value">LINKED</span>
                        </span>
                        <span className="pd-dc-stat">
                            <span className="pd-dc-stat-label">SERVER</span>
                            <span className="pd-dc-stat-value">
                                {discordInServer === true ? 'JOINED' : discordInServer === false ? 'NOT JOINED' : '—'}
                            </span>
                        </span>
                        {accentHex && (
                            <span className="pd-dc-stat">
                                <span className="pd-dc-stat-label">ACCENT</span>
                                <span className="pd-dc-stat-value">
                                    <span className="pd-dc-swatch" style={{ background: accentHex }} />
                                    {accentHex.toUpperCase()}
                                </span>
                            </span>
                        )}
                    </div>
                </>
            ) : (
                <p className="pd-dc-pitch">
                    {isOwnProfile
                        ? 'The PD Discord is where the talk happens. Link your Discord so PD knows you there — your handle and pfp show right here.'
                        : 'No Discord linked yet.'}
                </p>
            )}

            <div className="pd-dc-doors">
                {isOwnProfile && !linked && (
                    <button
                        type="button"
                        className={`pd-dc-btn pd-dc-btn-connect${!isAuthed ? ' auth-gated' : ''}`}
                        onClick={link}
                    >
                        <DiscordLogo />
                        <span>CONNECT DISCORD</span>
                    </button>
                )}
                {joinBtn}
                {isOwnProfile && linked && (
                    <button type="button" className="pd-dc-btn pd-dc-btn-unlink" onClick={() => { void unlink(); }}>
                        <span>UNLINK</span>
                    </button>
                )}
            </div>
        </div>
    );
}
