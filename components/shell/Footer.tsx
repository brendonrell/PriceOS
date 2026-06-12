'use client';
import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useGasData } from '../../lib/hooks/useGasData';
import { moodOfDay, type Mood } from '../../lib/mood/mood';

export function Footer() {
    const { showToast } = useToast();
    const { open } = useModal();
    const { data } = useGasData(true);

    /* Mood Ring easter egg — today's platform vibe (lib/mood). Computed
       after mount so SSR/CSR can't disagree at a midnight boundary (same
       pattern as the hero date slot). The ⌬ ring wears today's colour;
       tapping spells the vibe out. */
    const [mood, setMood] = useState<Mood | null>(null);
    useEffect(() => {
        setMood(moodOfDay());
    }, []);

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
                <span className="priceos-link" title="About PD" style={{ cursor: 'pointer' }} onClick={() => showToast('About PD: COMING SOON')}>
                    About PD
                </span>
                <span className="priceos-sep">·</span>
                <a className="priceos-link" href="https://discord.gg/mJteKZmg28" onClick={(e) => { e.preventDefault(); window.open('https://discord.gg/mJteKZmg28', '_blank', 'noopener,noreferrer'); }}>
                    Join Our Discord
                </a>
                <span className="priceos-sep">·</span>
                <span className="priceos-link" title="Docs" style={{ cursor: 'pointer' }} onClick={() => showToast('Docs: COMING SOON')}>
                    Docs
                </span>
                <span className="priceos-sep">·</span>
                <a className="priceos-link" href="mailto:support@pricediscussion.com">
                    Support
                </a>
                {mood && (
                    <>
                        <span className="priceos-sep">·</span>
                        <span
                            className="priceos-link priceos-mood"
                            title="Mood Ring — the platform's daily vibe"
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                                showToast(`PLATFORM VIBE TODAY: ${mood.name}`)
                            }
                        >
                            <span
                                className="priceos-mood-ring"
                                style={{ color: mood.hex }}
                            >
                                ⌬&#xFE0E;
                            </span>{' '}
                            {mood.name}
                        </span>
                    </>
                )}
            </footer>
        </>
    );
}
