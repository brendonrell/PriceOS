'use client';

/*
 * ProfileTagsConfirmModal — the consent gate for the Profile Tags door
 * (Brendon, 2026-08-22).
 *
 * The door button in MyPdSection navigates the person away from Settings to
 * their own profile to open the tag/colourway egg — same confirm-before-leave
 * pattern as Panopticon's gate (PanopticonConfirmModal): only "Turn on"
 * actually navigates, dismissing does nothing. Own CSS (styles/
 * profileTagsConfirm.css, .ptc-* prefix) cloned from Panopticon's consent-
 * modal shell rather than sharing its classes. Self-contained (does its own
 * navigation, not a callback prop) and mounted once in PriceOSShell, exactly
 * like Panopticon.
 */

import { useRouter } from 'next/navigation';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useDropdown } from '../lib/state/DropdownContext';

const VS15 = '︎';

export default function ProfileTagsConfirmModal() {
    const { close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('profileTagsConfirm');
    const { handle } = useAuth();
    const { closeMenu } = useDropdown();
    const router = useRouter();

    /* Same action as MyPdSection's openProfileTagsDoor — duplicated here
       rather than passed in as a prop, so this modal stays self-contained
       and mountable once in PriceOSShell, exactly like Panopticon's. */
    const turnOn = () => {
        if (handle) {
            closeMenu();
            try { sessionStorage.setItem('pd_open_tag_egg', '1'); } catch { /* ignore */ }
            if (typeof window !== 'undefined' && window.location.pathname === `/${handle}`) {
                window.dispatchEvent(new CustomEvent('pd:open-tag-egg'));
            } else {
                router.push(`/${handle}`);
            }
        }
        close();
    };

    return (
        <div
            className={`ptc-backdrop${isOpen ? ' active' : ''}`}
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Profile Tags"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="ptc-card" onClick={(e) => e.stopPropagation()}>
                <div className="ptc-title">
                    <span className="ptc-title-glyph">{`\u2311${VS15}`}</span>
                    <span className="ptc-title-text">PROFILE TAGS</span>
                </div>

                <p className="ptc-lead">
                    Turn on Profile Tags? You&rsquo;ll be sent to your profile.
                </p>

                <div className="ptc-actions">
                    <button type="button" className="ptc-btn ptc-btn--ghost" onClick={close}>
                        Not now
                    </button>
                    <button type="button" className="ptc-btn ptc-btn--go" onClick={turnOn}>
                        Turn on Profile Tags
                    </button>
                </div>
            </div>
        </div>
    );
}
