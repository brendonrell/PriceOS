'use client';

/*
 * SocialActivityFeed — "who's following this, lately" (Brendon, 2026-09-14).
 * Sits below the Social hero in a Project's or Output's +More Social tab.
 * Reads /api/social-activity, newest first. Reuses the same feed-row
 * grammar as the home/project activity feed (icon · stacked date/time ·
 * sentence) so it matches the app's established visual language — no new
 * CSS, and text contrast is inherited from the existing feed-row rules.
 *
 * Scope note: only FOLLOW moments are logged (project_follows /
 * output_follows rows) — an unfollow just deletes the row, so there's no
 * "X unfollowed" history in the schema today. See the panel's inline note.
 */

import { useEffect, useState } from 'react';
import { GhostFeedRows } from '../GhostFeed';

interface Row { follower_address: string; follower_name: string | null; created_at: string }

function fmtDate(iso: string): string {
    const d = new Date(iso);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${mon} ${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function shortAddr(a: string): string {
    return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default function SocialActivityFeed({ project, output }: { project?: string; output?: string }) {
    const [rows, setRows] = useState<Row[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const qs = output ? `output=${encodeURIComponent(output)}` : `project=${encodeURIComponent(project ?? '')}`;
        const load = () =>
            fetch(`/api/social-activity?${qs}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled) setRows(d?.rows ?? []); })
                .catch(() => { if (!cancelled) setRows([]); });
        load();
        const onR = () => load();
        window.addEventListener('pd:project-follows-changed', onR);
        window.addEventListener('pd:project-refresh', onR);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:project-follows-changed', onR);
            window.removeEventListener('pd:project-refresh', onR);
        };
    }, [project, output]);

    if (rows === null) return <GhostFeedRows count={3} />;
    if (rows.length === 0) {
        return (
            <div className="feed-row">
                <div className="feed-line" />
                <div className="f-icon-wrap">{'\u263B\uFE0E'}</div>
                <div className="f-content">NO FOLLOW ACTIVITY YET</div>
            </div>
        );
    }

    return (
        <>
            {rows.map((r) => {
                const href = r.follower_name ? `/${r.follower_name}` : `/${r.follower_address}`;
                const name = r.follower_name ? `@${r.follower_name}` : shortAddr(r.follower_address);
                return (
                    <div className="feed-row" key={`${r.follower_address}-${r.created_at}`}>
                        <div className="feed-line" />
                        <div className="f-icon-wrap">{'\u263B\uFE0E'}</div>
                        <div className="f-time">
                            <span>{fmtDate(r.created_at)}</span>
                            <span>{fmtTime(r.created_at)}</span>
                        </div>
                        <div className="f-type">
                            <span>FOLLOW</span>
                        </div>
                        <div className="f-content">
                            <a className="f-highlight" href={href} onClick={(e) => e.stopPropagation()}>{name}</a>
                            {' '}started following this {output ? 'output' : 'project'}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
