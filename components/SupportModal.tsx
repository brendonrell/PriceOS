'use client';

/*
 * SupportModal
 *
 * The footer "Support" link — v1 placeholder shell (Brendon edits the copy
 * from here). Same .platform-modal chrome as PriceosModal/AboutPdModal,
 * without the figlet header: title, short copy, the support address, and
 * the Discord fast lane.
 */

import { useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { DISCORD_URL } from '../lib/config/discord';

const VS15 = '︎';
const SUPPORT_EMAIL = 'support@pricediscussion.com';

export default function SupportModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'support';

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    return (
        <div
            id="supportModal"
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
                {'×'}
                {VS15}
            </div>
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 520, width: '100%' }}
            >
                <div className="priceos-changelog-sep">
                    {'────────'} SUPPORT {'────────'}
                </div>
                <div className="collectors-list priceos-changelog-list apd-body" style={{ width: '100%' }}>
                    <p className="apd-p">
                        Something broken? Something confusing? Something you
                        can&apos;t find? Write us — a human reads everything.
                    </p>
                    <div className="apd-links">
                        <a className="apd-link-row" href={`mailto:${SUPPORT_EMAIL}`}>
                            <span className="apd-link-k">EMAIL</span>
                            <span className="apd-link-v">{SUPPORT_EMAIL}</span>
                        </a>
                        <a
                            className="apd-link-row"
                            href={DISCORD_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span className="apd-link-k">FASTEST</span>
                            <span className="apd-link-v">the Discord</span>
                        </a>
                    </div>
                    <p className="apd-p">
                        Include the page you were on and what you expected to
                        happen — that&apos;s usually the whole fix.
                    </p>
                </div>
            </div>
        </div>
    );
}
