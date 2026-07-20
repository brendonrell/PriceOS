'use client';

/*
 * ProjectsProModal — opens off the "PRO" stat on the home hero. Same chrome as
 * the Friend Inspector (Brendon, 2026-07-11): a compact floating popup
 * ("PROJECTS PRO") that expands to a full jumbo panel ("PROJECTS PRO+"). The
 * body is a simple alphabetical list of every registered Project — the same
 * shape as the Connect-menu Artists list — each row tapping through to its page.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import { allProjects } from '../lib/project/registry';
import { projectSpriteFace } from '../lib/project/projectSprite';
import SpriteFace from './SpriteFace';

const VS15 = '︎';

export default function ProjectsProModal() {
    const { openModal, close, closeAll } = useModal();
    const { showToast } = useToast();
    const router = useRouter();
    const isOpen = openModal?.name === 'projectsPro';
    const [full, setFull] = useState(false);

    // Reset to compact on every open (matches the Friend Inspector).
    useEffect(() => {
        if (!isOpen) { setFull(false); return; }
        /* Lock the page only in PLUS (full) mode; compact floats and lets the
           page scroll behind it (Brendon, 2026-07-14). */
        if (!full) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen, full]);

    // Esc: step out of PLUS first, then close.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (full) setFull(false); else close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, full, close]);

    const projects = useMemo(
        () => [...allProjects()].sort((a, b) => a.displayName.localeCompare(b.displayName)),
        [],
    );

    if (!isOpen || typeof document === 'undefined') return null;

    const title = (words: string) => (
        <span className="ambient-pop-title-text">
            <span className="smgr-title-ic">{`⬚${VS15}`}</span>{' '}<span className="smgr-title-words">{words}</span>
        </span>
    );

    const go = (slug: string) => { router.push(`/art/${slug}`); closeAll(); };

    const list = (
        <div className="projects-pro-list">
            {projects.map((p) => {
                const face = projectSpriteFace(p.slug);
                return (
                    <div
                        key={p.slug}
                        className="projects-pro-row"
                        role="button"
                        tabIndex={0}
                        title={p.displayName}
                        onClick={() => go(p.slug)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(p.slug); } }}
                    >
                        {face && <SpriteFace className="collected-sprite" face={face} />}
                        <span className="projects-pro-name">
                            <span className="ppn-head">{p.displayName.slice(0, -6)}</span>
                            <span className="ppn-tail">{p.displayName.slice(-6)}</span>
                        </span>
                        <span className="projects-pro-leader" />
                        <span className="projects-pro-artist">@{p.artistHandle}</span>
                    </div>
                );
            })}
        </div>
    );

    // ── PROJECTS PRO+ — full jumbo panel ──
    if (full) {
        return createPortal(
            <div className="sticker-mgr-plus-backdrop" role="dialog" aria-modal="true" aria-label="Projects Pro" onClick={close}>
                <div className="sticker-mgr-plus followers-plus projects-pro-plus" onClick={(e) => e.stopPropagation()}>
                    <div className="smgr-plus-head">
                        {title('PROJECTS PRO+')}
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Projects Pro: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
                            {`↓${VS15}`}
                        </button>
                        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                            {`×${VS15}`}
                        </span>
                    </div>
                    <div className="followers-plus-body">
                        {list}
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    // ── PROJECTS PRO — compact floating popup ──
    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="Projects Pro" onClick={close}>
            <div className="ambient-pop followers-pop projects-pro-pop" role="dialog" aria-label="Projects Pro" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    {title('PROJECTS PRO')}
                    <button className="smgr-expand" type="button" onClick={() => { setFull(true); showToast('Projects Pro: PLUS'); }} title="Open Projects Pro+" aria-label="Open Projects Pro+">
                        {`↑${VS15}`}
                    </button>
                </div>
                <div className="followers-pop-body">
                    {list}
                </div>
            </div>
        </div>,
        document.body,
    );
}
