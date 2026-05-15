'use client';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useGasData } from '../../lib/hooks/useGasData';

export function Footer() {
    const { showToast } = useToast();
    const { open } = useModal();
    const { data } = useGasData(true);

    const gweiText = data
        ? `${data.standardGwei < 10 ? data.standardGwei.toFixed(2) : data.standardGwei.toFixed(1)} gwei`
        : '— gwei';

    const blockText = data
        ? `Blk ${data.blockNumber.toLocaleString()}`
        : 'Blk —';

    return (
        <>
            <footer className="priceos-footer" id="priceosFooter">
                <span className="priceos-link priceos-label" title="Changelog" style={{ cursor: 'pointer' }} onClick={() => open('priceos')}>
                    PriceOS 1.0
                </span>
                <span className="priceos-sep">·</span>
                <span className="priceos-status" id="footerStatus">Connected</span>
                <span className="priceos-sep">·</span>
                <span className="priceos-gwei" id="footerGwei">{gweiText}</span>
                <span className="priceos-sep">·</span>
                <span className="priceos-block" id="footerBlock">{blockText}</span>
                <span className="priceos-sep priceos-sep-desktop">·</span>
                <span className="priceos-footer-break" />
                <span className="priceos-link" title="About PD" style={{ cursor: 'pointer' }} onClick={() => showToast('About PD — coming soon')}>
                    About PD
                </span>
                <span className="priceos-sep">·</span>
                <a className="priceos-link" href="https://discord.gg/mJteKZmg28" target="_blank" rel="noopener noreferrer">
                    Join Our Discord
                </a>
                <span className="priceos-sep">·</span>
                <span className="priceos-link" title="Docs" style={{ cursor: 'pointer' }} onClick={() => showToast('Docs — coming soon')}>
                    Docs
                </span>
                <span className="priceos-sep">·</span>
                <a className="priceos-link" href="mailto:support@pricediscussion.com">
                    Support
                </a>
            </footer>

            <style jsx global>{`
                .priceos-footer {
                    position: fixed;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 90;
                    box-sizing: border-box;
                    margin-top: 0;
                    pointer-events: auto;
                }

                main {
                    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
                }

                body.zen-mode main {
                    padding-bottom: 0;
                }

                @media (max-width: 600px) {
                    main {
                        padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
                    }
                }
            `}</style>
        </>
    );
}
