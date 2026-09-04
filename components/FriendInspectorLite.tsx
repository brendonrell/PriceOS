'use client';

/*
 * FRIEND INSPECTOR LITE — who follows this Output (Brendon, 2026-07-29).
 *
 * The Friend Inspector proper is a dossier of YOUR circle: tabs, duels, the
 * whole ledger. This is its lite cut — the same chrome and the same row
 * anatomy, opened from the follower count on an Output, and it does exactly
 * one thing: name the people who follow that piece. No tabs, no duel, no
 * stat columns.
 *
 * Rule #0 all the way down: the compact ambient-pop shell is the Friend
 * Inspector's own, and every person is the standard ASCII-ID
 * (sprite › rank › @name › Sigil) with their profile tags in the spot
 * immediately after — the one identity unit, unchanged.
 *
 * THE PARENT PROJECT COUNTS. An Output is always followed by the project it
 * came from (parental support — it is why the count is never 0), so the
 * project leads the list. Without it the list would read one short of the
 * number that opened it.
 *
 * Door in: the follower count on the Output hero. Out: × · Esc · backdrop.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import AsciiId from './hero/AsciiId';
import { UserTagsFor } from './tags/UserTags';
import SpriteFace from './SpriteFace';
import { projectSpriteFace } from '../lib/project/projectSprite';
import { getProject } from '../lib/project/registry';
import type { OutputFollowersResponse } from '../app/api/output-follows/route';

const VS15 = '︎';

export default function FriendInspectorLite() {
    const { close, stack } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('followersLite');
    /* Payload is the global output ref — `{slug}-{tokenId}` — read off THIS
       modal's OWN stack entry, not openModal (the top of the stack). This
       modal can sit stacked underneath another one (isTopStacked exists for
       exactly that case); reading openModal?.payload directly used to trust
       whatever string payload the modal ON TOP happened to carry — several
       other modals key off a string payload too (KeychainCharmModal,
       PalPanel), so a stack like followersLite → keychain would silently
       swap in a charm id as the "output ref" here, fetching/showing the
       wrong Output's followers (same bug class fixed in CollectorsModal,
       2026-09-04). stack.find keeps this instance's own payload correct
       regardless of what's stacked on top. */
    const ref = (() => {
        const entry = stack.find((m) => m.name === 'followersLite');
        return typeof entry?.payload === 'string' ? entry.payload : '';
    })();

    const [handles, setHandles] = useState<string[] | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    useEffect(() => {
        if (!isOpen || !ref) { setHandles(null); return; }
        let live = true;
        setHandles(null);
        fetch(`/api/output-follows?output=${encodeURIComponent(ref)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j: OutputFollowersResponse | null) => {
                if (live) setHandles(j?.follower_handles ?? []);
            })
            .catch(() => { if (live) setHandles([]); });
        return () => { live = false; };
    }, [isOpen, ref]);

    if (!isOpen || typeof document === 'undefined') return null;

    const slug = ref.slice(0, ref.lastIndexOf('-')).toLowerCase();
    const project = getProject(slug);
    const projectFace = project ? projectSpriteFace(slug) : '';

    return createPortal(
        <div
            className="sticker-mgr-backdrop followers-backdrop"
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Friend Inspector Lite"
            onClick={close}
        >
            <div className="ambient-pop followers-pop" onClick={(e) => e.stopPropagation()}>
                <span
                    className="ambient-pop-close"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                >
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`☻${VS15}`}</span>{' '}
                        <span className="smgr-title-words">FRIEND INSPECTOR LITE</span>
                    </span>
                </div>
                <div className="followers-pop-body">
                    {handles === null ? (
                        <div className="fil-note">Loading…</div>
                    ) : (
                        <>
                            {/* The project always follows its own Output. */}
                            {project && (
                                <div className="fi-row">
                                    <div className="fi-line">
                                        <div className="fi-line-main">
                                            <div className="fm-row-main">
                                                <div className="fm-row-id">
                                                    <span className="collected-pair">
                                                        {projectFace && (
                                                            <span className="collected-sprite">
                                                                <SpriteFace face={projectFace} />
                                                            </span>
                                                        )}
                                                        <a className="profile-link" href={`/art/${slug}`}>
                                                            {project.displayName}
                                                        </a>
                                                    </span>
                                                    <span className="fi-rel" title="The project this piece came from">
                                                        {`⟁${VS15}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {handles.map((h) => (
                                <div className="fi-row" key={h}>
                                    <div className="fi-line">
                                        <div className="fi-line-main">
                                            <div className="fm-row-main">
                                                <div className="fm-row-id">
                                                    <AsciiId handle={h} />
                                                </div>
                                                <UserTagsFor handle={h} size="row" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!project && handles.length === 0 && (
                                <div className="fil-note">Nobody follows this piece yet.</div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
